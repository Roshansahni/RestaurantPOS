import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import get_db
from .models import User
from .security import read_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try:
        username = read_token(token)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    u = db.query(User).filter_by(username=username, active=True).first()
    if not u:
        raise HTTPException(401, "User not found")
    return u

def require(*roles):
    def dep(u: User = Depends(current_user)) -> User:
        if u.role not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return u
    return dep
