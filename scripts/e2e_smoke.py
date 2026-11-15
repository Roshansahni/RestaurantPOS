"""End-to-end smoke test against a LIVE server. Usage: python scripts/e2e_smoke.py http://localhost:8000 <seed-password>"""
import sys, httpx, json
from decimal import Decimal, ROUND_HALF_UP
from websockets.sync.client import connect

base, pw = sys.argv[1], sys.argv[2]
c = httpx.Client(base_url=base, timeout=15); results = []
def check(name, cond, extra=""):
    results.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if (extra and not cond) else ""))
def login(u):
    r = c.post("/api/auth/login", data={"username": u, "password": pw}); return r.json() if r.status_code == 200 else None
H = lambda t: {"Authorization": "Bearer " + t["access_token"]}
q = lambda x: Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP)

T = {u: login(u) for u in ["admin", "manager", "cashier1", "cashier2", "kitchen1", "kitchen2"]}
check("all 6 demo users can sign in with correct roles", all(T.values()) and [T[u]["role"] for u in T] == ["admin", "manager", "cashier", "cashier", "kitchen", "kitchen"])
adm, cas, kit = H(T["admin"]), H(T["cashier1"]), H(T["kitchen1"])

prods = c.get("/api/products?limit=200", headers=cas).json()
check("40 seeded products", len(prods) == 40)
tables = c.get("/api/tables", headers=cas).json(); check("10 seeded tables", len(tables) == 10)
inv = c.get("/api/inventory", headers=adm).json(); rice = next(i for i in inv if i["name"] == "Rice")
p1, p2 = prods[0], prods[1]

# recipe + live websocket
c.put(f"/api/recipes/{p1['id']}", headers=adm, json={"ingredients": [{"item_id": rice["id"], "quantity": "0.2"}]})
ws = connect(base.replace("http", "ws") + "/ws/kitchen"); ws.send(T["kitchen1"]["access_token"])
check("websocket ready", json.loads(ws.recv(timeout=5))["type"] == "ready")
cust = c.get("/api/customers", headers=cas).json()[0]
o = c.post("/api/orders", headers=cas, json={"order_type": "dine_in", "table_id": tables[0]["id"], "customer_id": cust["id"], "priority": "rush", "discount": "20",
    "items": [{"product_id": p1["id"], "qty": 2}, {"product_id": p2["id"], "qty": 1}]}).json()
check("kitchen receives live event on new order", json.loads(ws.recv(timeout=5))["type"] == "orders_changed")
sub = q(Decimal(p1["price"]) * 2 + Decimal(p2["price"])); disc = Decimal("20")
tax = sum(q((Decimal(p["price"]) * n - disc * Decimal(p["price"]) * n / sub) * Decimal(p["gst_rate"]) / 100) for p, n in [(p1, 2), (p2, 1)])
check("GST total matches independent calculation", q(o["total"]) == q(sub - disc + tax), f'{o["total"]} vs {q(sub - disc + tax)}')
check("CGST + SGST equal total tax", q(Decimal(str(o["cgst"])) + Decimal(str(o["sgst"]))) == q(tax))
check("order is rush", o["priority"] == "rush")
rice_now = next(i for i in c.get("/api/inventory", headers=adm).json() if i["name"] == "Rice")
check("recipe deducted 0.4 kg rice", Decimal(str(rice["quantity"])) - Decimal(str(rice_now["quantity"])) == Decimal("0.4"))
check("table occupied", next(t for t in c.get("/api/tables", headers=cas).json() if t["id"] == tables[0]["id"])["status"] == "occupied")
pay = c.post(f"/api/orders/{o['id']}/pay", headers=cas, json={"method": "upi"}); check("payment + invoice number", pay.status_code == 200 and pay.json()["invoice"].startswith("INV-"))
check("double payment rejected", c.post(f"/api/orders/{o['id']}/pay", headers=cas, json={"method": "cash"}).status_code == 400)
for st in ["preparing", "ready", "completed"]:
    check(f"kitchen sets {st}", c.patch(f"/api/orders/{o['id']}/status", headers=kit, json={"status": st}).status_code == 200)
check("table freed after completion", next(t for t in c.get("/api/tables", headers=cas).json() if t["id"] == tables[0]["id"])["status"] == "available")
ws.close()

# RBAC + management
check("cashier blocked from dashboard", c.get("/api/reports/dashboard", headers=cas).status_code == 403)
check("kitchen blocked from creating products", c.post("/api/products", headers=kit, json={"name": "x", "price": "1"}).status_code == 403)
d = c.get("/api/reports/dashboard", headers=adm).json()
check("dashboard revenue equals the paid order", q(d["revenue"]) == q(o["total"]) and d["popular"][0]["qty"] == 2)
check("customer spend tracked", q(next(x for x in c.get("/api/customers", headers=cas).json() if x["id"] == cust["id"])["total_spent"]) == q(o["total"]))
for rep in ["sales", "payments", "inventory", "expenses"]:
    check(f"export {rep} csv+pdf", c.get(f"/api/reports/export?report={rep}&format=csv", headers=adm).status_code == 200 and c.get(f"/api/reports/export?report={rep}&format=pdf", headers=adm).content[:4] == b"%PDF")
png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
up = c.post(f"/api/products/{p1['id']}/image", headers=adm, files={"file": ("a.png", png, "image/png")})
check("image upload + served", up.status_code == 200 and c.get(up.json()["image_path"]).status_code == 200)
check("non-image upload rejected", c.post(f"/api/products/{p1['id']}/image", headers=adm, files={"file": ("a.png", b"hello", "image/png")}).status_code == 400)
check("invalid GST rate rejected", c.post("/api/products", headers=adm, json={"name": "Bad", "price": "10", "gst_rate": "7"}).status_code == 400)
check("settings update + GSTIN validation", c.put("/api/settings", headers=adm, json={"name": "Demo Cafe", "gstin": "08ABCDE1234F1Z5"}).status_code == 200 and c.put("/api/settings", headers=adm, json={"name": "x", "gstin": "bad"}).status_code == 400)

# auth hardening
r = c.post("/api/auth/refresh", json={"refresh_token": T["cashier1"]["refresh_token"]}); check("refresh works", r.status_code == 200)
check("old refresh token replay rejected", c.post("/api/auth/refresh", json={"refresh_token": T["cashier1"]["refresh_token"]}).status_code == 401)
check("security headers present", c.get("/api/auth/me", headers=adm).headers.get("x-frame-options") == "DENY")
codes = [c.post("/api/auth/login", data={"username": "nobody", "password": "x"}).status_code for _ in range(6)]
check("lockout after 5 failures", codes == [401] * 5 + [429], str(codes))
check("audit log records failures", any(a["action"] == "login_failed" for a in c.get("/api/audit", headers=adm).json()))
print(f"\n{sum(results)}/{len(results)} checks passed"); sys.exit(0 if all(results) else 1)
