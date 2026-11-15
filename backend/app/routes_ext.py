from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .deps import current_user, require
from .models import *
from .schemas import *
from .routes import audit

router = APIRouter(prefix="/api")
STAFF = ("admin", "manager")
SALES = ("admin", "manager", "cashier")

def cust_dict(db, c):
    spent = db.query(func.coalesce(func.sum(Order.total), 0)).filter_by(customer_id=c.id, paid=True).scalar()
    n = db.query(Order).filter_by(customer_id=c.id).count()
    return {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "orders": n, "total_spent": spent}

@router.get("/customers")
def customers(q: str = "", skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _=Depends(require(*SALES))):
    qs = db.query(Customer)
    if q: qs = qs.filter(Customer.name.ilike(f"%{q}%") | Customer.phone.contains(q))
    return [cust_dict(db, c) for c in qs.order_by(Customer.name).offset(skip).limit(min(limit, 200))]

@router.post("/customers", status_code=201)
def add_customer(b: CustomerIn, db: Session = Depends(get_db), u=Depends(require(*SALES))):
    c = Customer(**b.model_dump()); db.add(c)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "A customer with this phone already exists")
    return cust_dict(db, c)

@router.get("/customers/{cid}/orders")
def customer_orders(cid: int, db: Session = Depends(get_db), _=Depends(require(*SALES))):
    return [{"id": o.id, "total": o.total, "status": o.status, "created_at": o.created_at}
            for o in db.query(Order).filter_by(customer_id=cid).order_by(Order.id.desc())]

@router.get("/employees")
def employees(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    return [{"id": e.id, "name": e.name, "role": e.role, "phone": e.phone, "active": e.active} for e in db.query(Employee)]

@router.post("/employees", status_code=201)
def add_employee(b: EmployeeIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = Employee(**b.model_dump()); db.add(e); audit(db, u, "employee_create", b.name); db.commit()
    return {"id": e.id, **b.model_dump()}

@router.post("/employees/{eid}/attendance", status_code=201)
def mark_attendance(eid: int, present: bool = True, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    from datetime import datetime
    if not db.get(Employee, eid): raise HTTPException(404, "Employee not found")
    db.add(Attendance(employee_id=eid, day=datetime.utcnow(), present=present)); db.commit()
    return {"ok": True}

@router.post("/suppliers", status_code=201)
def add_supplier(b: SupplierIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    s = Supplier(**b.model_dump()); db.add(s)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Supplier already exists")
    return {"id": s.id, **b.model_dump()}

def inv_dict(i):
    return {"id": i.id, "name": i.name, "unit": i.unit, "quantity": i.quantity,
            "reorder_level": i.reorder_level, "low": i.quantity <= i.reorder_level}

@router.get("/inventory")
def inventory(low_only: bool = False, db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    items = [inv_dict(i) for i in db.query(InventoryItem).order_by(InventoryItem.name)]
    return [i for i in items if i["low"]] if low_only else items

@router.post("/inventory", status_code=201)
def add_item(b: InventoryIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    i = InventoryItem(**b.model_dump()); db.add(i)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Item already exists")
    return inv_dict(i)

@router.post("/inventory/{iid}/stock")
def stock(iid: int, b: StockIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    i = db.query(InventoryItem).filter_by(id=iid).with_for_update().first()
    if not i: raise HTTPException(404, "Item not found")
    change = b.quantity if b.kind in ("purchase", "adjustment") else -b.quantity
    if i.quantity + change < 0: raise HTTPException(400, "Not enough stock for this consumption")
    i.quantity += change
    db.add(StockTransaction(item_id=i.id, kind=b.kind, change=change, cost=b.cost, user_id=u.id))
    audit(db, u, "stock_" + b.kind, f"{i.name}:{change}"); db.commit(); db.refresh(i)
    return inv_dict(i)
