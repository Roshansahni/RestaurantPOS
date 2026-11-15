import os, uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .deps import require
from .models import Product
from .routes import audit

router = APIRouter(prefix="/api")
MAX = 1_000_000

def sniff(b: bytes):
    if b.startswith(b"\x89PNG\r\n\x1a\n"): return "png"
    if b.startswith(b"\xff\xd8\xff"): return "jpg"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP": return "webp"
    return None

@router.post("/products/{pid}/image")
async def upload_image(pid: int, file: UploadFile = File(...), db: Session = Depends(get_db), u=Depends(require("admin", "manager"))):
    p = db.get(Product, pid)
    if not p: raise HTTPException(404, "Product not found")
    data = await file.read(MAX + 1)
    if len(data) > MAX: raise HTTPException(413, "Image must be 1 MB or smaller")
    ext = sniff(data)  # trust file content, not the filename or declared type
    if not ext: raise HTTPException(400, "Only PNG, JPEG or WebP images are allowed")
    name = f"{pid}-{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(settings.upload_dir, "products", name), "wb") as f: f.write(data)
    if p.image_path:
        old = os.path.join(settings.upload_dir, "products", os.path.basename(p.image_path))
        if os.path.exists(old): os.remove(old)
    p.image_path = f"/uploads/products/{name}"; audit(db, u, "product_image", str(pid)); db.commit()
    return {"image_path": p.image_path}
