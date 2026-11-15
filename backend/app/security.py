from datetime import datetime, timedelta, timezone
import bcrypt, jwt
from .config import settings

def hash_pw(p: str) -> str: return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_pw(p: str, h: str) -> bool: return bcrypt.checkpw(p.encode(), h.encode())

def make_token(sub: str, minutes: int | None = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes or settings.access_minutes)
    return jwt.encode({"sub": sub, "exp": exp}, settings.jwt_secret, algorithm="HS256")

def read_token(t: str) -> str:
    return jwt.decode(t, settings.jwt_secret, algorithms=["HS256"])["sub"]
