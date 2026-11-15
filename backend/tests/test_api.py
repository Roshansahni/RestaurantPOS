import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["UPLOAD_DIR"] = "./test_uploads"
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Product, RestaurantTable
from app.security import hash_pw
from app.billing import compute

@pytest.fixture()
def client():
    from app.auth_security import limiter; limiter.reset()
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    db = SessionLocal()
    for n, r in [("admin","admin"),("cash","cashier"),("kit","kitchen")]:
        db.add(User(username=n, full_name=n, role=r, password_hash=hash_pw("testpass123")))
    db.add(Product(name="Paneer Tikka", price=Decimal("200"), gst_rate=Decimal("5")))
    db.add(RestaurantTable(label="T1"))
    db.commit(); db.close()
    return TestClient(app)

def auth(c, u):
    t = c.post("/api/auth/login", data={"username": u, "password": "testpass123"}).json()["access_token"]
    return {"Authorization": f"Bearer {t}"}

def test_gst_intra_state():
    t = compute([(Decimal("200"), 2, Decimal("5"))])
    assert (t["subtotal"], t["cgst"], t["sgst"], t["total"]) == (Decimal("400.00"), Decimal("10.00"), Decimal("10.00"), Decimal("420.00"))

def test_gst_with_discount_and_igst():
    t = compute([(Decimal("100"), 1, Decimal("18"))], Decimal("10"), interstate=True)
    assert t["igst"] == Decimal("16.20") and t["total"] == Decimal("106.20") and t["cgst"] == 0

def test_bad_login(client):
    assert client.post("/api/auth/login", data={"username": "admin", "password": "x"}).status_code == 401

def test_no_token(client):
    assert client.get("/api/products").status_code == 401

def test_rbac_kitchen_cannot_add_product(client):
    r = client.post("/api/products", json={"name": "X", "price": "10"}, headers=auth(client, "kit"))
    assert r.status_code == 403

def test_rbac_cashier_cannot_see_reports(client):
    assert client.get("/api/reports/summary", headers=auth(client, "cash")).status_code == 403

def test_order_pay_kitchen_flow(client):
    h = auth(client, "cash")
    o = client.post("/api/orders", headers=h, json={"order_type": "dine_in", "table_id": 1,
        "items": [{"product_id": 1, "qty": 2}]}).json()
    assert o["total"] == "420.00" or Decimal(str(o["total"])) == Decimal("420.00")
    p = client.post(f"/api/orders/{o['id']}/pay", headers=h, json={"method": "cash"})
    assert p.status_code == 200 and p.json()["invoice"].startswith("INV-")
    assert client.post(f"/api/orders/{o['id']}/pay", headers=h, json={"method": "cash"}).status_code == 400
    k = auth(client, "kit")
    assert client.patch(f"/api/orders/{o['id']}/status", headers=k, json={"status": "preparing"}).status_code == 200
    assert client.patch(f"/api/orders/{o['id']}/status", headers=k, json={"status": "cancelled"}).status_code == 403

def test_dine_in_needs_table(client):
    r = client.post("/api/orders", headers=auth(client, "cash"),
        json={"order_type": "dine_in", "items": [{"product_id": 1, "qty": 1}]})
    assert r.status_code == 400

def test_inventory_flow_and_low_stock(client):
    h = auth(client, "admin")
    i = client.post("/api/inventory", headers=h, json={"name": "Rice", "unit": "kg", "reorder_level": "5"}).json()
    assert i["low"] is True
    r = client.post(f"/api/inventory/{i['id']}/stock", headers=h, json={"kind": "purchase", "quantity": "20", "cost": "800"}).json()
    assert Decimal(str(r["quantity"])) == 20 and r["low"] is False
    assert client.post(f"/api/inventory/{i['id']}/stock", headers=h, json={"kind": "consumption", "quantity": "25"}).status_code == 400
    client.post(f"/api/inventory/{i['id']}/stock", headers=h, json={"kind": "consumption", "quantity": "16"})
    assert len(client.get("/api/inventory?low_only=true", headers=h).json()) == 1

def test_inventory_rbac(client):
    assert client.get("/api/inventory", headers=auth(client, "cash")).status_code == 403

def test_customer_spend_tracking(client):
    h = auth(client, "cash")
    c = client.post("/api/customers", headers=h, json={"name": "Asha", "phone": "9876543210"}).json()
    assert client.post("/api/customers", headers=h, json={"name": "Dup", "phone": "9876543210"}).status_code == 409
    o = client.post("/api/orders", headers=h, json={"order_type": "takeaway", "customer_id": c["id"], "items": [{"product_id": 1, "qty": 2}]}).json()
    client.post(f"/api/orders/{o['id']}/pay", headers=h, json={"method": "upi"})
    got = client.get("/api/customers?q=asha", headers=h).json()[0]
    assert got["orders"] == 1 and Decimal(str(got["total_spent"])) == Decimal("420.00")

def test_employee_admin_only_area(client):
    assert client.get("/api/employees", headers=auth(client, "kit")).status_code == 403
    assert client.post("/api/employees", headers=auth(client, "admin"), json={"name": "Ravi", "role": "chef"}).status_code == 201

def test_dashboard_reports(client):
    h = auth(client, "cash")
    o = client.post("/api/orders", headers=h, json={"order_type": "takeaway", "items": [{"product_id": 1, "qty": 3}]}).json()
    client.post(f"/api/orders/{o['id']}/pay", headers=h, json={"method": "cash"})
    a = auth(client, "admin")
    d = client.get("/api/reports/dashboard", headers=a).json()
    assert Decimal(str(d["revenue"])) == Decimal("630.00") and d["popular"][0] == {"name": "Paneer Tikka", "qty": 3}
    assert d["daily"][-1]["orders"] == 1 and len(d["recent"]) == 1
    assert client.get("/api/reports/sales.csv", headers=a).text.startswith("date,orders,revenue")
    assert client.get("/api/reports/sales.pdf", headers=a).content.startswith(b"%PDF")
    assert client.get("/api/reports/dashboard", headers=h).status_code == 403

def test_tables_crud_and_rbac(client):
    a, c = auth(client, "admin"), auth(client, "cash")
    assert client.post("/api/tables", headers=c, json={"label": "T9"}).status_code == 403
    t = client.post("/api/tables", headers=a, json={"label": "T9", "seats": 6}).json()
    assert client.post("/api/tables", headers=a, json={"label": "T9"}).status_code == 409
    assert client.put(f"/api/tables/{t['id']}", headers=a, json={"label": "T9", "seats": 2, "status": "reserved"}).json()["status"] == "reserved"
    assert client.delete(f"/api/tables/{t['id']}", headers=a).status_code == 204

def test_settings_admin_only_and_gstin(client):
    a, c = auth(client, "admin"), auth(client, "cash")
    assert client.get("/api/settings", headers=c).status_code == 200
    assert client.put("/api/settings", headers=c, json={"name": "X"}).status_code == 403
    assert client.put("/api/settings", headers=a, json={"name": "X", "gstin": "bad"}).status_code == 400
    assert client.put("/api/settings", headers=a, json={"name": "Spice Hub", "gstin": "08ABCDE1234F1Z5"}).json()["name"] == "Spice Hub"

def test_password_change(client):
    h = auth(client, "cash")
    assert client.post("/api/auth/password", headers=h, json={"old_password": "wrong", "new_password": "newpass1234"}).status_code == 400
    assert client.post("/api/auth/password", headers=h, json={"old_password": "testpass123", "new_password": "newpass1234"}).status_code == 200
    assert client.post("/api/auth/login", data={"username": "cash", "password": "newpass1234"}).status_code == 200
    assert client.post("/api/auth/login", data={"username": "cash", "password": "testpass123"}).status_code == 401

def test_user_management(client):
    a = auth(client, "admin")
    assert client.get("/api/users", headers=auth(client, "cash")).status_code == 403
    u = client.post("/api/users", headers=a, json={"username": "newbie", "full_name": "N", "password": "longenough1", "role": "cashier"})
    assert u.status_code == 201 and "password" not in str(u.json())
    assert client.patch(f"/api/users/{u.json()['id']}", headers=a, json={"active": False}).json()["active"] is False
    assert client.post("/api/auth/login", data={"username": "newbie", "password": "longenough1"}).status_code == 401
    me = client.get("/api/auth/me", headers=a).json()["id"]
    assert client.patch(f"/api/users/{me}", headers=a, json={"active": False}).status_code == 400

def _inv(client, h, qty="10"):
    i = client.post("/api/inventory", headers=h, json={"name": "Paneer", "unit": "kg", "reorder_level": "1"}).json()
    client.post(f"/api/inventory/{i['id']}/stock", headers=h, json={"kind": "purchase", "quantity": qty})
    return i["id"]

def test_recipe_deducts_and_restores_stock(client):
    a, c = auth(client, "admin"), auth(client, "cash")
    iid = _inv(client, a)
    assert client.put("/api/recipes/1", headers=a, json={"ingredients": [{"item_id": iid, "quantity": "0.25"}]}).status_code == 200
    o = client.post("/api/orders", headers=c, json={"order_type": "takeaway", "items": [{"product_id": 1, "qty": 4}]}).json()
    q = lambda: Decimal(str([x for x in client.get("/api/inventory", headers=a).json() if x["id"] == iid][0]["quantity"]))
    assert q() == Decimal("9.000")
    client.patch(f"/api/orders/{o['id']}/status", headers=c, json={"status": "cancelled"})
    assert q() == Decimal("10.000")
    client.patch(f"/api/orders/{o['id']}/status", headers=c, json={"status": "cancelled"})
    assert q() == Decimal("10.000")  # no double restore

def test_recipe_rules(client):
    a = auth(client, "admin")
    assert client.put("/api/recipes/1", headers=auth(client, "cash"), json={"ingredients": []}).status_code == 403
    assert client.put("/api/recipes/1", headers=a, json={"ingredients": [{"item_id": 99, "quantity": "1"}]}).status_code == 400

def test_expenses_and_profit(client):
    a = auth(client, "admin")
    assert client.post("/api/expenses", headers=auth(client, "cash"), json={"category": "Rent", "amount": "100"}).status_code == 403
    client.post("/api/expenses", headers=a, json={"category": "Rent", "amount": "1500.50"})
    assert Decimal(str(client.get("/api/reports/profit", headers=a).json()["expenses"])) == Decimal("1500.50")

def test_reservations(client):
    c = auth(client, "cash")
    body = {"table_id": 1, "guest_name": "Meera", "party_size": 2, "reserved_for": "2030-01-01T19:00:00"}
    r = client.post("/api/reservations", headers=c, json=body)
    assert r.status_code == 201
    assert client.post("/api/reservations", headers=c, json={**body, "reserved_for": "2030-01-01T20:00:00"}).status_code == 409
    assert client.post("/api/reservations", headers=c, json={**body, "party_size": 9, "reserved_for": "2030-02-01T20:00:00"}).status_code == 400
    assert client.patch(f"/api/reservations/{r.json()['id']}", headers=c, json={"status": "seated"}).json()["status"] == "seated"
    assert client.get("/api/tables", headers=c).json()[0]["status"] == "occupied"

def test_period_payment_inventory_reports(client):
    c, a = auth(client, "cash"), auth(client, "admin")
    o = client.post("/api/orders", headers=c, json={"order_type": "takeaway", "items": [{"product_id": 1, "qty": 1}]}).json()
    client.post(f"/api/orders/{o['id']}/pay", headers=c, json={"method": "card"})
    for per in ["day", "week", "month", "year"]:
        r = client.get(f"/api/reports/sales?period={per}", headers=a).json()
        assert len(r) == 1 and r[0]["orders"] == 1
    assert client.get("/api/reports/payments", headers=a).json()[0]["method"] == "card"
    assert client.get("/api/reports/inventory", headers=a).status_code == 200
    assert client.get("/api/reports/sales?period=week", headers=c).status_code == 403

def test_websocket_requires_valid_token(client):
    import pytest
    from starlette.websockets import WebSocketDisconnect
    with client.websocket_connect("/ws/kitchen") as ws:
        ws.send_text("not-a-token")
        with pytest.raises(WebSocketDisconnect) as e:
            ws.receive_text()
        assert e.value.code == 4401

def test_websocket_pushes_order_events(client):
    c = auth(client, "cash"); tok = c["Authorization"].split()[1]
    with client.websocket_connect("/ws/kitchen") as ws:
        ws.send_text(tok)
        assert ws.receive_json() == {"type": "ready"}
        o = client.post("/api/orders", headers=c, json={"order_type": "takeaway", "items": [{"product_id": 1, "qty": 1}]}).json()
        assert ws.receive_json() == {"type": "orders_changed"}
        client.patch(f"/api/orders/{o['id']}/status", headers=auth(client, "kit"), json={"status": "preparing"})
        assert ws.receive_json() == {"type": "orders_changed"}


def test_login_lockout_after_five_failures(client):
    for _ in range(5):
        assert client.post("/api/auth/login", data={"username": "admin", "password": "bad"}).status_code == 401
    r = client.post("/api/auth/login", data={"username": "admin", "password": "testpass123"})
    assert r.status_code == 429 and "Retry-After" in r.headers

def test_refresh_rotation_and_reuse_detection(client):
    d = client.post("/api/auth/login", data={"username": "cash", "password": "testpass123"}).json()
    r1 = client.post("/api/auth/refresh", json={"refresh_token": d["refresh_token"]})
    assert r1.status_code == 200
    new = r1.json()
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + new["access_token"]}).status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": d["refresh_token"]}).status_code == 401  # replay
    assert client.post("/api/auth/refresh", json={"refresh_token": new["refresh_token"]}).status_code == 401  # family revoked

def test_logout_and_password_change_revoke_sessions(client):
    d = client.post("/api/auth/login", data={"username": "cash", "password": "testpass123"}).json()
    client.post("/api/auth/logout", json={"refresh_token": d["refresh_token"]})
    assert client.post("/api/auth/refresh", json={"refresh_token": d["refresh_token"]}).status_code == 401
    d2 = client.post("/api/auth/login", data={"username": "cash", "password": "testpass123"}).json()
    h = {"Authorization": "Bearer " + d2["access_token"]}
    client.post("/api/auth/password", headers=h, json={"old_password": "testpass123", "new_password": "another-pass1"})
    assert client.post("/api/auth/refresh", json={"refresh_token": d2["refresh_token"]}).status_code == 401

def test_audit_log_admin_only_and_headers(client):
    client.post("/api/auth/login", data={"username": "cash", "password": "wrong"})
    a = auth(client, "admin")
    rows = client.get("/api/audit", headers=a).json()
    assert any(r["action"] == "login_failed" for r in rows)
    assert client.get("/api/audit", headers=auth(client, "cash")).status_code == 403
    r = client.get("/api/auth/me", headers=a)
    assert r.headers["X-Content-Type-Options"] == "nosniff" and r.headers["X-Frame-Options"] == "DENY"


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 50

def test_product_image_upload_rules(client):
    a = auth(client, "admin")
    ok = client.post("/api/products/1/image", headers=a, files={"file": ("x.png", PNG, "image/png")})
    assert ok.status_code == 200 and ok.json()["image_path"].startswith("/uploads/products/1-")
    assert client.get(ok.json()["image_path"]).status_code == 200
    assert client.get("/api/products", headers=a).json()[0]["image_path"] == ok.json()["image_path"]
    assert client.post("/api/products/1/image", headers=a, files={"file": ("x.png", b"<script>alert(1)</script>", "image/png")}).status_code == 400
    assert client.post("/api/products/1/image", headers=a, files={"file": ("x.png", PNG + b"0" * 1_000_001, "image/png")}).status_code == 413
    assert client.post("/api/products/1/image", headers=auth(client, "cash"), files={"file": ("x.png", PNG, "image/png")}).status_code == 403

def test_configurable_gst_rates(client):
    a = auth(client, "admin")
    assert client.post("/api/products", headers=a, json={"name": "Odd", "price": "10", "gst_rate": "7"}).status_code == 400
    s = {"name": "R", "gst_rates": "0,7,18", "default_gst_rate": 7, "currency_symbol": "Rs"}
    assert client.put("/api/settings", headers=a, json=s).json()["gst_rates"] == "0,7,18"
    assert client.post("/api/products", headers=a, json={"name": "Odd", "price": "10", "gst_rate": "7"}).status_code == 201
    assert client.put("/api/settings", headers=a, json={**s, "default_gst_rate": 5}).status_code == 400
    assert client.put("/api/settings", headers=a, json={**s, "gst_rates": "5;12"}).status_code == 422

def test_priority_expense_employee_supplier_edits(client):
    a, c = auth(client, "admin"), auth(client, "cash")
    o = client.post("/api/orders", headers=c, json={"order_type": "takeaway", "priority": "rush", "items": [{"product_id": 1, "qty": 1}]}).json()
    assert o["priority"] == "rush"
    assert client.patch(f"/api/orders/{o['id']}/priority?priority=normal", headers=c).json()["priority"] == "normal"
    assert client.patch(f"/api/orders/{o['id']}/priority?priority=bogus", headers=c).status_code == 422
    e = client.post("/api/expenses", headers=a, json={"category": "Gas", "amount": "100"}).json()
    assert client.put(f"/api/expenses/{e['id']}", headers=a, json={"category": "Gas", "amount": "120"}).json()["amount"] in ("120", 120, "120.00")
    assert client.delete(f"/api/expenses/{e['id']}", headers=a).status_code == 204
    emp = client.post("/api/employees", headers=a, json={"name": "Ravi", "role": "chef"}).json()
    client.post(f"/api/employees/{emp['id']}/attendance", headers=a)
    assert client.put(f"/api/employees/{emp['id']}", headers=a, json={"name": "Ravi K", "role": "chef", "active": False}).json()["name"] == "Ravi K"
    assert client.delete(f"/api/employees/{emp['id']}", headers=a).status_code == 204
    sup = client.post("/api/suppliers", headers=a, json={"name": "FarmCo"}).json()
    assert client.delete(f"/api/suppliers/{sup['id']}", headers=a).status_code == 204

def test_export_all_reports(client):
    a = auth(client, "admin")
    for rep in ["sales", "payments", "inventory", "expenses"]:
        assert client.get(f"/api/reports/export?report={rep}&format=csv", headers=a).status_code == 200
        assert client.get(f"/api/reports/export?report={rep}&format=pdf", headers=a).content.startswith(b"%PDF")
    assert client.get("/api/reports/export?report=sales", headers=auth(client, "cash")).status_code == 403
    assert client.get("/api/reports/export?report=nope", headers=a).status_code == 422
