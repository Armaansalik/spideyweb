"""
Optional backend for the CV Web-Shooter Dashboard.

The frontend is fully self-contained: hand tracking (MediaPipe Tasks
Vision) runs entirely in the browser via WASM/WebGL, so this backend is
NOT required to use the app.

What this DOES provide, for anyone who wants to extend the project:
  - A WebSocket endpoint the frontend can optionally connect to, which
    broadcasts gesture/web-shot events to every other connected client
    (e.g. to build a shared "everyone sees the same wall" mode, or to
    log sessions for later analysis).
  - A REST endpoint stub where heavier server-side CV (a custom
    PyTorch gesture classifier, a YOLO object-detection pass on
    uploaded frames, etc.) could be plugged in later.

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CV Web-Shooter Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only - restrict this in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class GestureEvent(BaseModel):
    gesture: str
    confidence: float
    brick_id: int | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for connection in self.active:
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for ws in stale:
            self.disconnect(ws)


manager = ConnectionManager()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "cv-webshooter-backend"}


@app.post("/events/gesture")
async def post_gesture_event(event: GestureEvent) -> dict[str, Any]:
    """
    Optional REST hook: the frontend may POST gesture/web-shot events
    here for logging, analytics, or to fan them out over the shared
    WebSocket channel below.
    """
    payload = {"type": "gesture", "ts": time.time(), **event.model_dump()}
    await manager.broadcast(payload)
    return {"received": True}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            data["ts"] = time.time()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
