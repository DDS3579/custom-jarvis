# server.py
import asyncio
import threading
import queue
import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from bridge import msg_queue, post 
import main  # Now perfectly safe from circular imports!

app = FastAPI()

# Allow React (localhost:5173) to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread-safe queue for messages from main.py
msg_queue = queue.Queue()

def post(event, data=None):
    """This is imported by main.py to send events to the React GUI"""
    msg_queue.put({"type": event, "payload": data})

# Import main AFTER defining post to avoid circular import errors
import main

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
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive. You can also receive text inputs from React here later.
            await websocket.receive_text() 
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    # 1. Start the background task to broadcast queue messages to React
    asyncio.create_task(broadcast_loop())
    
    # 2. Start the Jarvis Voice Loop in a background thread
    threading.Thread(target=main.write, daemon=True).start()
    
    # 3. Start System Metrics loop (CPU/RAM)
    asyncio.create_task(metrics_loop())

async def broadcast_loop():
    while True:
        try:
            msg = msg_queue.get_nowait()
            await manager.broadcast(msg)
        except queue.Empty:
            await asyncio.sleep(0.05) # Prevent CPU hogging

async def metrics_loop():
    while True:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        await manager.broadcast({"type": "metrics", "payload": {"cpu": cpu, "ram": ram}})
        await asyncio.sleep(2)