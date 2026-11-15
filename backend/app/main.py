from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import Base, engine
from .routes import router
from .routes_ext import router as ext_router
from .routes_reports import router as reports_router
from .routes_admin import router as admin_router
from .routes_more import router as more_router
from .realtime import router as ws_router
from .routes_auth import router as auth_router
from .routes_media import router as media_router
import os
from fastapi.staticfiles import StaticFiles

if settings.database_url.startswith("sqlite"):
    Base.metadata.create_all(engine)  # SQLite dev only; PostgreSQL uses Alembic
if not settings.database_url.startswith("sqlite") and settings.jwt_secret.startswith("dev-only"):
    raise RuntimeError("Set a strong JWT_SECRET (openssl rand -hex 32) before using PostgreSQL / production.")
app = FastAPI(title="RestaurantPOS API")

@app.middleware("http")
async def security_headers(request, call_next):
    r = await call_next(request)
    r.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store"})
    return r

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","),
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
app.include_router(ext_router)
app.include_router(reports_router)
app.include_router(admin_router)
app.include_router(more_router)
app.include_router(ws_router)
app.include_router(auth_router)
os.makedirs(os.path.join(settings.upload_dir, "products"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(media_router)
