from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .db import get_db
from .deps import require
from .models import AuditLog, User
from .auth_security import find_refresh, issue_tokens, revoke_all

router = APIRouter(prefix="/api")

class RefreshIn(BaseModel):
    refresh_token: str

@router.post("/auth/refresh")
def refresh(b: RefreshIn, db: Session = Depends(get_db)):
    t = find_refresh(db, b.refresh_token)
    if not t: raise HTTPException(401, "Session expired. Please sign in again.")
    if t.revoked:  # a rotated token was replayed: assume theft and end every session for this user
        revoke_all(db, t.user_id); db.commit()
        raise HTTPException(401, "Session expired. Please sign in again.")
    u = db.get(User, t.user_id)
    if t.expires_at < datetime.utcnow() or not u or not u.active:
        raise HTTPException(401, "Session expired. Please sign in again.")
    t.revoked = True
    out = issue_tokens(db, u); db.commit(); return out

@router.post("/auth/logout")
def logout(b: RefreshIn, db: Session = Depends(get_db)):
    t = find_refresh(db, b.refresh_token)
    if t: t.revoked = True; db.commit()
    return {"ok": True}

@router.get("/audit")
def audit_log(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _=Depends(require("admin"))):
    rows = (db.query(AuditLog, User.username).outerjoin(User, User.id == AuditLog.user_id)
            .order_by(AuditLog.id.desc()).offset(skip).limit(min(limit, 500)).all())
    return [{"id": a.id, "user": n or "-", "action": a.action, "detail": a.detail, "created_at": a.created_at} for a, n in rows]
