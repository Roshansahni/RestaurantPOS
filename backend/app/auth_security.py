import hashlib, secrets, time
from datetime import datetime, timedelta
from fastapi import HTTPException
from .models import RefreshToken
from .security import make_token

REFRESH_DAYS = 7

class LoginLimiter:
    """In-memory failed-login limiter (single process). 5 failures per account or 20 per IP in 15 minutes -> 429."""
    WINDOW = 900
    def __init__(self): self.fails: dict[str, list[float]] = {}
    def _prune(self, key):
        now = time.time(); self.fails[key] = [t for t in self.fails.get(key, []) if now - t < self.WINDOW]
        return self.fails[key]
    def check(self, user_key, ip_key):
        for key, limit in ((user_key, 5), (ip_key, 20)):
            hits = self._prune(key)
            if len(hits) >= limit:
                wait = int(self.WINDOW - (time.time() - hits[0])) + 1
                raise HTTPException(429, f"Too many failed attempts. Try again in {wait // 60 + 1} minutes.", headers={"Retry-After": str(wait)})
    def fail(self, user_key, ip_key):
        for k in (user_key, ip_key): self.fails.setdefault(k, []).append(time.time())
    def ok(self, user_key): self.fails.pop(user_key, None)
    def reset(self): self.fails.clear()

limiter = LoginLimiter()
_h = lambda t: hashlib.sha256(t.encode()).hexdigest()

def issue_tokens(db, user):
    raw = secrets.token_urlsafe(32)
    db.add(RefreshToken(user_id=user.id, token_hash=_h(raw), expires_at=datetime.utcnow() + timedelta(days=REFRESH_DAYS)))
    return {"access_token": make_token(user.username), "refresh_token": raw, "token_type": "bearer", "role": user.role}

def find_refresh(db, raw): return db.query(RefreshToken).filter_by(token_hash=_h(raw)).first()

def revoke_all(db, user_id):
    db.query(RefreshToken).filter_by(user_id=user_id, revoked=False).update({"revoked": True})
