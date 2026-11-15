from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from .db import get_db
from .deps import current_user, require
from .models import *
from .schemas import *
from .security import verify_pw, make_token
from .billing import compute
from .stock_logic import apply_recipes
from .realtime import notify
from .settings_logic import check_rate
from .auth_security import limiter, issue_tokens

router = APIRouter(prefix="/api")
STAFF = ("admin", "manager")
SALES = ("admin", "manager", "cashier")

def audit(db, user, action, detail=""):
    db.add(AuditLog(user_id=user.id if user else None, action=action, detail=detail))

@router.post("/auth/login")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    uk, ik = form.username.lower(), "ip:" + (request.client.host if request.client else "?")
    limiter.check(uk, ik)
    u = db.query(User).filter_by(username=form.username, active=True).first()
    if not u or not verify_pw(form.password, u.password_hash):
        limiter.fail(uk, ik)
        audit(db, None, "login_failed", form.username); db.commit()
        raise HTTPException(401, "Incorrect username or password")
    limiter.ok(uk)
    out = issue_tokens(db, u); audit(db, u, "login"); db.commit()
    return out

@router.get("/auth/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role}

# ---- Menu ----
@router.get("/products", response_model=list[ProductOut])
def products(q: str = "", category_id: int | None = None, skip: int = 0, limit: int = 100,
             db: Session = Depends(get_db), _=Depends(current_user)):
    qs = db.query(Product)
    if q: qs = qs.filter(Product.name.ilike(f"%{q}%"))
    if category_id: qs = qs.filter_by(category_id=category_id)
    return qs.order_by(Product.name).offset(skip).limit(min(limit, 200)).all()

@router.post("/products", response_model=ProductOut, status_code=201)
def add_product(p: ProductIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    check_rate(db, p.gst_rate)
    obj = Product(**p.model_dump()); db.add(obj); audit(db, u, "product_create", p.name)
    db.commit(); db.refresh(obj); return obj

@router.put("/products/{pid}", response_model=ProductOut)
def edit_product(pid: int, p: ProductIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    obj = db.get(Product, pid)
    if not obj: raise HTTPException(404, "Product not found")
    check_rate(db, p.gst_rate)
    for k, v in p.model_dump().items(): setattr(obj, k, v)
    audit(db, u, "product_update", str(pid)); db.commit(); db.refresh(obj); return obj

@router.delete("/products/{pid}", status_code=204)
def del_product(pid: int, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    obj = db.get(Product, pid)
    if not obj: raise HTTPException(404, "Product not found")
    db.delete(obj); audit(db, u, "product_delete", str(pid)); db.commit()

# ---- Orders ----
def order_dict(o: Order):
    return {"id": o.id, "order_type": o.order_type, "status": o.status, "table_id": o.table_id,
            "subtotal": o.subtotal, "discount": o.discount, "cgst": o.cgst, "sgst": o.sgst,
            "igst": o.igst, "total": o.total, "paid": o.paid, "priority": o.priority, "created_at": o.created_at,
            "items": [{"name": i.name, "qty": i.qty, "unit_price": i.unit_price, "gst_rate": i.gst_rate} for i in o.items]}

@router.post("/orders", status_code=201)
def create_order(body: OrderIn, db: Session = Depends(get_db), u=Depends(require(*SALES))):
    prods = {p.id: p for p in db.query(Product).filter(Product.id.in_([i.product_id for i in body.items]))}
    lines, items = [], []
    for i in body.items:
        p = prods.get(i.product_id)
        if not p or not p.available:
            raise HTTPException(400, f"Product {i.product_id} unavailable")
        lines.append((p.price, i.qty, p.gst_rate))
        items.append(OrderItem(product_id=p.id, name=p.name, qty=i.qty, unit_price=p.price, gst_rate=p.gst_rate))
    try:
        t = compute(lines, body.discount, body.interstate)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if body.order_type == "dine_in":
        tbl = db.get(RestaurantTable, body.table_id) if body.table_id else None
        if not tbl: raise HTTPException(400, "Dine-in requires a valid table")
        tbl.status = "occupied"
    if body.customer_id and not db.get(Customer, body.customer_id): raise HTTPException(400, "Unknown customer")
    o = Order(customer_id=body.customer_id, order_type=body.order_type, table_id=body.table_id, created_by=u.id, items=items, priority=body.priority, **t)
    db.add(o); apply_recipes(db, [(i.product_id, i.qty) for i in items], u, -1); audit(db, u, "order_create"); db.commit(); db.refresh(o)
    notify()
    return order_dict(o)

@router.get("/orders")
def list_orders(status: str | None = None, skip: int = 0, limit: int = 50,
                db: Session = Depends(get_db), _=Depends(current_user)):
    qs = db.query(Order)
    if status: qs = qs.filter_by(status=status)
    return [order_dict(o) for o in qs.order_by(Order.id.desc()).offset(skip).limit(min(limit, 200))]

@router.patch("/orders/{oid}/status")
def set_status(oid: int, body: StatusIn, db: Session = Depends(get_db), u=Depends(current_user)):
    kitchen_ok = {"preparing", "ready", "completed"}
    if u.role == "kitchen" and body.status not in kitchen_ok: raise HTTPException(403, "Insufficient permissions")
    if u.role not in ("admin", "manager", "cashier", "kitchen"): raise HTTPException(403, "Forbidden")
    o = db.get(Order, oid)
    if not o: raise HTTPException(404, "Order not found")
    if o.paid and body.status == "cancelled": raise HTTPException(400, "Paid orders cannot be cancelled")
    if body.status == "cancelled" and o.status != "cancelled":
        apply_recipes(db, [(i.product_id, i.qty) for i in o.items], u, 1)
    o.status = body.status
    if body.status in ("completed", "cancelled") and o.table_id:
        db.get(RestaurantTable, o.table_id).status = "available"
    audit(db, u, "order_status", f"{oid}->{body.status}"); db.commit()
    notify()
    return order_dict(o)

@router.post("/orders/{oid}/pay")
def pay(oid: int, body: PayIn, db: Session = Depends(get_db), u=Depends(require(*SALES))):
    o = db.get(Order, oid)
    if not o: raise HTTPException(404, "Order not found")
    if o.paid or o.status == "cancelled": raise HTTPException(400, "Order not payable")
    db.add(Payment(order_id=o.id, method=body.method, amount=o.total))  # simulated: no gateway
    o.paid = True
    db.flush()
    inv = Invoice(order_id=o.id, number=f"INV-{o.created_at.year}-{o.id:06d}")
    db.add(inv); audit(db, u, "payment", f"{oid}:{body.method}"); db.commit()
    notify()
    return {"invoice": inv.number, "order": order_dict(o), "note": "Simulated payment"}

@router.get("/reports/summary")
def summary(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    rev = db.query(func.coalesce(func.sum(Order.total), 0)).filter_by(paid=True).scalar()
    return {"revenue": rev, "orders": db.query(Order).count(),
            "products": db.query(Product).count()}

@router.get("/tables")
def tables(db: Session = Depends(get_db), _=Depends(current_user)):
    return [{"id": t.id, "label": t.label, "seats": t.seats, "status": t.status} for t in db.query(RestaurantTable)]

@router.get("/categories")
def categories(db: Session = Depends(get_db), _=Depends(current_user)):
    return [{"id": c.id, "name": c.name} for c in db.query(Category).order_by(Category.name)]
