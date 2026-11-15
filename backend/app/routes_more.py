from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from .db import get_db
from .deps import require
from .models import *
from .routes import audit
from .realtime import notify
import csv, io
from fastapi.responses import Response

router = APIRouter(prefix="/api")
STAFF = ("admin", "manager"); SALES = ("admin", "manager", "cashier")

class IngIn(BaseModel):
    item_id: int
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
class RecipeIn(BaseModel):
    ingredients: list[IngIn]
class ExpenseIn(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    note: str = Field(default="", max_length=200)
class ResIn(BaseModel):
    table_id: int
    guest_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(default="", max_length=20)
    party_size: int = Field(default=2, ge=1, le=50)
    reserved_for: datetime
class ResStatus(BaseModel):
    status: Literal["booked", "seated", "completed", "cancelled"]

def db_recipe(r): return {"product_id": r.product_id, "ingredients": [{"item_id": i.item_id, "quantity": i.quantity} for i in r.ingredients]}

@router.get("/recipes/{pid}")
def get_recipe(pid: int, db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    r = db.query(Recipe).filter_by(product_id=pid).first()
    return db_recipe(r) if r else {"product_id": pid, "ingredients": []}

@router.put("/recipes/{pid}")
def set_recipe(pid: int, b: RecipeIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    if not db.get(Product, pid): raise HTTPException(404, "Product not found")
    ids = [i.item_id for i in b.ingredients]
    if len(set(ids)) != len(ids): raise HTTPException(400, "Each ingredient can appear once")
    if db.query(InventoryItem).filter(InventoryItem.id.in_(ids)).count() != len(ids): raise HTTPException(400, "Unknown ingredient")
    r = db.query(Recipe).filter_by(product_id=pid).first() or Recipe(product_id=pid)
    r.ingredients = [RecipeIngredient(item_id=i.item_id, quantity=i.quantity) for i in b.ingredients]
    db.add(r); audit(db, u, "recipe_set", str(pid)); db.commit(); return db_recipe(r)

@router.post("/expenses", status_code=201)
def add_expense(b: ExpenseIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = Expense(**b.model_dump(), created_by=u.id); db.add(e); audit(db, u, "expense_create", str(b.amount)); db.commit()
    return {"id": e.id, **b.model_dump()}

@router.get("/expenses")
def list_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    rows = db.query(Expense).order_by(Expense.id.desc()).offset(skip).limit(min(limit, 200)).all()
    return [{"id": e.id, "category": e.category, "amount": e.amount, "note": e.note, "created_at": e.created_at} for e in rows]

def resd(r): return {"id": r.id, "table_id": r.table_id, "guest_name": r.guest_name, "phone": r.phone, "party_size": r.party_size, "reserved_for": r.reserved_for, "status": r.status}

@router.get("/reservations")
def list_res(db: Session = Depends(get_db), _=Depends(require(*SALES))):
    return [resd(r) for r in db.query(Reservation).order_by(Reservation.reserved_for.desc()).limit(200)]

@router.post("/reservations", status_code=201)
def add_res(b: ResIn, db: Session = Depends(get_db), u=Depends(require(*SALES))):
    t = db.get(RestaurantTable, b.table_id)
    if not t: raise HTTPException(400, "Unknown table")
    if b.party_size > t.seats: raise HTTPException(400, f"Table {t.label} seats only {t.seats}")
    lo, hi = b.reserved_for - timedelta(hours=2), b.reserved_for + timedelta(hours=2)
    if db.query(Reservation).filter(Reservation.table_id == b.table_id, Reservation.status == "booked", Reservation.reserved_for > lo, Reservation.reserved_for < hi).first():
        raise HTTPException(409, "Table already booked within 2 hours of that time")
    r = Reservation(**b.model_dump()); db.add(r); audit(db, u, "reservation_create", b.guest_name); db.commit(); return resd(r)

@router.patch("/reservations/{rid}")
def set_res(rid: int, b: ResStatus, db: Session = Depends(get_db), u=Depends(require(*SALES))):
    r = db.get(Reservation, rid)
    if not r: raise HTTPException(404, "Reservation not found")
    r.status = b.status
    if b.status == "seated": db.get(RestaurantTable, r.table_id).status = "occupied"
    db.commit(); return resd(r)

# ---- reports ----
FMT = {"day": "%Y-%m-%d", "week": "%G-W%V", "month": "%Y-%m", "year": "%Y"}
SPAN = {"day": 1, "week": 7, "month": 31, "year": 366}

@router.get("/reports/sales")
def sales(period: Literal["day", "week", "month", "year"] = "day", count: int = Query(12, ge=1, le=60), db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    since = datetime.utcnow() - timedelta(days=SPAN[period] * count)
    agg = defaultdict(lambda: [0, Decimal("0")])
    for created, total in db.query(Order.created_at, Order.total).filter(Order.paid.is_(True), Order.created_at >= since):
        k = created.strftime(FMT[period]); agg[k][0] += 1; agg[k][1] += total
    return [{"period": k, "orders": v[0], "revenue": v[1]} for k, v in sorted(agg.items())]

@router.get("/reports/payments")
def payments(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    rows = db.query(Payment.method, func.count(Payment.id), func.sum(Payment.amount)).filter_by(status="success").group_by(Payment.method).all()
    return [{"method": m, "count": c, "amount": a} for m, c, a in rows]

@router.get("/reports/inventory")
def inv_report(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    spend = dict(db.query(StockTransaction.item_id, func.sum(StockTransaction.cost)).filter_by(kind="purchase").group_by(StockTransaction.item_id).all())
    return [{"name": i.name, "unit": i.unit, "quantity": i.quantity, "low": i.quantity <= i.reorder_level, "purchase_spend": spend.get(i.id, 0)} for i in db.query(InventoryItem).order_by(InventoryItem.name)]

@router.get("/reports/profit")
def profit(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    rev = db.query(func.coalesce(func.sum(Order.total), 0)).filter(Order.paid.is_(True)).scalar()
    exp = db.query(func.coalesce(func.sum(Expense.amount), 0)).scalar()
    return {"revenue_incl_gst": rev, "expenses": exp, "note": "Revenue includes GST collected; this is a simple cash view, not an accounting profit."}


@router.patch("/orders/{oid}/priority")
def set_priority(oid: int, priority: Literal["normal", "rush"], db: Session = Depends(get_db), u=Depends(require(*SALES))):
    o = db.get(Order, oid)
    if not o: raise HTTPException(404, "Order not found")
    o.priority = priority; audit(db, u, "order_priority", f"{oid}:{priority}"); db.commit(); notify()
    return {"id": o.id, "priority": o.priority}

@router.put("/expenses/{eid}")
def edit_expense(eid: int, b: ExpenseIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = db.get(Expense, eid)
    if not e: raise HTTPException(404, "Expense not found")
    for k, v in b.model_dump().items(): setattr(e, k, v)
    audit(db, u, "expense_update", str(eid)); db.commit(); return {"id": e.id, **b.model_dump()}

@router.delete("/expenses/{eid}", status_code=204)
def del_expense(eid: int, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = db.get(Expense, eid)
    if not e: raise HTTPException(404, "Expense not found")
    db.delete(e); audit(db, u, "expense_delete", str(eid)); db.commit()

class EmpIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=30)
    phone: str = ""
    active: bool = True

@router.put("/employees/{eid}")
def edit_employee(eid: int, b: EmpIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = db.get(Employee, eid)
    if not e: raise HTTPException(404, "Employee not found")
    for k, v in b.model_dump().items(): setattr(e, k, v)
    audit(db, u, "employee_update", str(eid)); db.commit(); return {"id": e.id, **b.model_dump()}

@router.delete("/employees/{eid}", status_code=204)
def del_employee(eid: int, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    e = db.get(Employee, eid)
    if not e: raise HTTPException(404, "Employee not found")
    db.query(Attendance).filter_by(employee_id=eid).delete(); db.delete(e); audit(db, u, "employee_delete", str(eid)); db.commit()

def _table(report, period, db):
    if report == "sales":
        rows = sales(period, 12, db, None); return ["Period", "Orders", "Revenue"], [[r["period"], r["orders"], r["revenue"]] for r in rows]
    if report == "payments":
        return ["Method", "Count", "Amount"], [[r["method"], r["count"], r["amount"]] for r in payments(db, None)]
    if report == "inventory":
        return ["Ingredient", "Unit", "In stock", "Low", "Purchase spend"], [[r["name"], r["unit"], r["quantity"], "yes" if r["low"] else "", r["purchase_spend"]] for r in inv_report(db, None)]
    return ["Date", "Category", "Note", "Amount"], [[str(e["created_at"])[:10], e["category"], e["note"], e["amount"]] for e in list_expenses(0, 200, db, None)]

@router.get("/reports/export")
def export(report: Literal["sales", "payments", "inventory", "expenses"], format: Literal["csv", "pdf"] = "csv",
           period: Literal["day", "week", "month", "year"] = "day", db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    head, rows = _table(report, period, db)
    if format == "csv":
        buf = io.StringIO(); w = csv.writer(buf); w.writerow(head); w.writerows(rows)
        return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={report}.csv"})
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    out = io.BytesIO(); c = canvas.Canvas(out, pagesize=A4); y = 800
    c.setFont("Helvetica-Bold", 14); c.drawString(50, y, f"{report.title()} report"); y -= 28
    colw = 480 / len(head)
    def line(vals, bold=False):
        nonlocal y
        if y < 60: c.showPage(); y = 800
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
        for i, v in enumerate(vals): c.drawString(50 + i * colw, y, str(v)[:28])
        y -= 15
    line(head, True)
    for r in rows: line(r)
    c.save()
    return Response(out.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={report}.pdf"})
