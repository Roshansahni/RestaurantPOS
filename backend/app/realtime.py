import asyncio, json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import jwt
from .db import SessionLocal
from .models import User
from .security import read_token

router = APIRouter()
_clients: set[WebSocket] = set()
_loop: asyncio.AbstractEventLoop | None = None

async def _broadcast(msg: dict):
    for ws in list(_clients):
        try: await ws.send_text(json.dumps(msg))
        except Exception: _clients.discard(ws)

def notify(kind: str = "orders_changed"):
    """Called from sync route handlers after a commit; no-op when nobody is connected."""
    if _loop and _clients and _loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast({"type": kind}), _loop)

def _valid(token: str) -> bool:
    try: name = read_token(token)
    except jwt.PyJWTError: return False
    with SessionLocal() as db:
        return db.query(User).filter_by(username=name, active=True).first() is not None

@router.websocket("/ws/kitchen")
async def kitchen_ws(ws: WebSocket):
    global _loop
    await ws.accept()
    try:  # first message must be the JWT (keeps tokens out of URLs and server logs)
        token = await asyncio.wait_for(ws.receive_text(), timeout=10)
    except Exception:
        await ws.close(code=4401); return
    if not _valid(token):
        await ws.close(code=4401); return
    _loop = asyncio.get_running_loop(); _clients.add(ws)
    await ws.send_text(json.dumps({"type": "ready"}))
    try:
        while True: await ws.receive_text()  # keeps the connection open; client pings are ignored
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
