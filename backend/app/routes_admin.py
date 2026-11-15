import re
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .deps import current_user, require
from .models import *
from .routes import audit
from .security import hash_pw, verify_pw
from .auth_security import revoke_all

router = APIRouter(prefix="/api")
STAFF = ("admin", "manager")
ROLE = Literal["admin", "manager", "cashier", "kitchen"]

class SettingsIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=300)
    gstin: str = Field(default="", max_length=15)
    phone: str = Field(default="", max_length=20)
    receipt_footer: str = Field(default="", max_length=200)
    currency_symbol: str = Field(default="₹", min_length=1, max_length=5)
    gst_rates: str = Field(default="0,5,12,18,28", pattern=r"^\d+(\.\d+)?(,\d+(\.\d+)?)*$", max_length=60)
    default_gst_rate: float = Field(default=5, ge=0, le=28)

class TableIn(BaseModel):
    label: str = Field(min_length=1, max_length=20)
    seats: int = Field(default=4, ge=1, le=50)
    status: Literal["available", "occupied", "reserved"] = "available"

class UserIn(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=100)
    role: ROLE

class UserPatch(BaseModel):
    role: ROLE | None = None
    active: bool | None = None

class PwIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=100)

def get_settings(db):
    s = db.get(RestaurantSettings, 1)
    if not s:
        s = RestaurantSettings(id=1); db.add(s); db.commit()
    return s

def sdict(s): return {"name": s.name, "address": s.address, "gstin": s.gstin, "phone": s.phone, "receipt_footer": s.receipt_footer, "currency_symbol": s.currency_symbol, "gst_rates": s.gst_rates, "default_gst_rate": float(s.default_gst_rate)}

@router.get("/settings")
def read_settings(db: Session = Depends(get_db), _=Depends(current_user)): return sdict(get_settings(db))

@router.put("/settings")
def write_settings(b: SettingsIn, db: Session = Depends(get_db), u=Depends(require("admin"))):
    if b.gstin and not re.fullmatch(r"[0-9A-Z]{15}", b.gstin): raise HTTPException(400, "GSTIN must be 15 letters/digits")
    if float(b.default_gst_rate) not in [float(x) for x in b.gst_rates.split(",")]: raise HTTPException(400, "Default GST rate must be one of the allowed rates")
    s = get_settings(db)
    for k, v in b.model_dump().items(): setattr(s, k, v)
    audit(db, u, "settings_update"); db.commit(); return sdict(s)

@router.post("/tables", status_code=201)
def add_table(b: TableIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    t = RestaurantTable(**b.model_dump()); db.add(t)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Table label already exists")
    return {"id": t.id, **b.model_dump()}

@router.put("/tables/{tid}")
def edit_table(tid: int, b: TableIn, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    t = db.get(RestaurantTable, tid)
    if not t: raise HTTPException(404, "Table not found")
    for k, v in b.model_dump().items(): setattr(t, k, v)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Table label already exists")
    return {"id": t.id, **b.model_dump()}

@router.delete("/tables/{tid}", status_code=204)
def del_table(tid: int, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    t = db.get(RestaurantTable, tid)
    if not t: raise HTTPException(404, "Table not found")
    if db.query(Order).filter_by(table_id=tid).first(): raise HTTPException(409, "Table has order history; mark it reserved instead of deleting")
    db.delete(t); db.commit()

@router.delete("/suppliers/{sid}", status_code=204)
def del_supplier(sid: int, db: Session = Depends(get_db), u=Depends(require(*STAFF))):
    s = db.get(Supplier, sid)
    if not s: raise HTTPException(404, "Supplier not found")
    if db.query(InventoryItem).filter_by(supplier_id=sid).first(): raise HTTPException(409, "Supplier is linked to inventory items")
    db.delete(s); db.commit()

@router.get("/suppliers")
def suppliers(db: Session = Depends(get_db), _=Depends(require(*STAFF))):
    return [{"id": s.id, "name": s.name, "phone": s.phone} for s in db.query(Supplier)]

def udict(x): return {"id": x.id, "username": x.username, "full_name": x.full_name, "role": x.role, "active": x.active}

@router.get("/users")
def users(db: Session = Depends(get_db), _=Depends(require("admin"))): return [udict(x) for x in db.query(User).order_by(User.id)]

@router.post("/users", status_code=201)
def add_user(b: UserIn, db: Session = Depends(get_db), u=Depends(require("admin"))):
    x = User(username=b.username, full_name=b.full_name, role=b.role, password_hash=hash_pw(b.password)); db.add(x)
    try: db.flush()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Username already taken")
    audit(db, u, "user_create", b.username); db.commit(); return udict(x)

@router.patch("/users/{uid}")
def patch_user(uid: int, b: UserPatch, db: Session = Depends(get_db), u=Depends(require("admin"))):
    x = db.get(User, uid)
    if not x: raise HTTPException(404, "User not found")
    if x.id == u.id and (b.active is False or (b.role and b.role != "admin")): raise HTTPException(400, "You cannot lock yourself out")
    if b.role: x.role = b.role
    if b.active is not None: x.active = b.active
    if b.active is False or b.role: revoke_all(db, x.id)
    audit(db, u, "user_update", x.username); db.commit(); return udict(x)

@router.post("/auth/password")
def change_password(b: PwIn, db: Session = Depends(get_db), u=Depends(current_user)):
    if not verify_pw(b.old_password, u.password_hash): raise HTTPException(400, "Current password is incorrect")
    u.password_hash = hash_pw(b.new_password); revoke_all(db, u.id); audit(db, u, "password_change"); db.commit()
    return {"ok": True}
