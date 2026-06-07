# server.py
import asyncio
import queue
import threading
import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Import the SINGLE shared queue — do NOT redefine post or msg_queue here
from bridge import msg_queue

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.remove(d)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection alive — receive_text() blocks until client sends
        # or disconnects. We don't need input from React right now but
        # this prevents the handler from exiting immediately.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.on_event("startup")
async def startup_event():
    # Broadcast loop: drains the shared bridge queue → all WS clients
    asyncio.create_task(broadcast_loop())
    # Metrics loop: CPU/RAM every 2s
    asyncio.create_task(metrics_loop())
    # Voice loop in a daemon thread — import here to avoid circular issues
    import main
    threading.Thread(target=main.write, daemon=True).start()


async def broadcast_loop():
    """
    Polls the thread-safe bridge queue and forwards every message to
    all connected WebSocket clients. 50ms sleep keeps CPU near zero
    while still being fast enough for real-time feel.
    """
    while True:
        try:
            msg = msg_queue.get_nowait()
            await manager.broadcast(msg)
        except queue.Empty:
            await asyncio.sleep(0.05)


async def metrics_loop():
    while True:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        await manager.broadcast({
            "type": "metrics",
            "payload": {"cpu": cpu, "ram": ram}
        })
        await asyncio.sleep(2)