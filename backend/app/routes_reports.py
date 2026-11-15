import csv, io
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from .db import get_db
from .deps import require
from .models import *

router = APIRouter(prefix="/api/reports")
STAFF = ("admin", "manager")

def daily_sales(db, days):
    start = (datetime.utcnow() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = db.query(Order.created_at, Order.total).filter(Order.paid.is_(True), Order.created_at >= start).all()
    agg = defaultdict(lambda: [0, 0.0])
    for created, total in rows:
        k = created.strftime("%Y-%m-%d"); agg[k][0] += 1; agg[k][1] += float(total)
    out = []
    for i in range(days):
        k = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        out.append({"date": k, "orders": agg[k][0], "revenue": round(agg[k][1], 2)})
    return out

@router.get("/dashboard")
def dashboard(days: int = Query(14, ge=1, le=90), db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    popular = (db.query(OrderItem.name, func.sum(OrderItem.qty).label("qty")).join(Order, Order.id == OrderItem.order_id)
               .filter(Order.paid.is_(True)).group_by(OrderItem.name).order_by(func.sum(OrderItem.qty).desc()).limit(5).all())
    recent = db.query(Payment).order_by(Payment.id.desc()).limit(8).all()
    low = db.query(InventoryItem).filter(InventoryItem.quantity <= InventoryItem.reorder_level).all()
    return {
        "revenue": db.query(func.coalesce(func.sum(Order.total), 0)).filter(Order.paid.is_(True)).scalar(),
        "orders": db.query(Order).count(), "customers": db.query(Customer).count(), "products": db.query(Product).count(),
        "daily": daily_sales(db, days),
        "popular": [{"name": n, "qty": int(q)} for n, q in popular],
        "recent": [{"id": p.id, "order_id": p.order_id, "method": p.method, "amount": p.amount, "created_at": p.created_at} for p in recent],
        "low_stock": [{"name": i.name, "quantity": i.quantity, "unit": i.unit} for i in low],
    }

@router.get("/sales.csv")
def sales_csv(days: int = Query(30, ge=1, le=366), db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    buf = io.StringIO(); w = csv.writer(buf); w.writerow(["date", "orders", "revenue"])
    for d in daily_sales(db, days): w.writerow([d["date"], d["orders"], d["revenue"]])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sales.csv"})

@router.get("/sales.pdf")
def sales_pdf(days: int = Query(30, ge=1, le=366), db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); y = 800
    c.setFont("Helvetica-Bold", 14); c.drawString(50, y, f"Sales report - last {days} days"); y -= 30
    c.setFont("Helvetica", 10); total = 0
    for d in daily_sales(db, days):
        if y < 60: c.showPage(); y = 800; c.setFont("Helvetica", 10)
        c.drawString(50, y, d["date"]); c.drawString(200, y, f'{d["orders"]} orders'); c.drawRightString(400, y, f'Rs {d["revenue"]:.2f}')
        total += d["revenue"]; y -= 16
    c.setFont("Helvetica-Bold", 11); c.drawString(50, y - 10, f"Total revenue: Rs {total:.2f}")
    c.save()
    return Response(buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=sales.pdf"})
