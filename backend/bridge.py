# # bridge.py
# import asyncio
# from typing import Optional

# _loop: Optional[asyncio.AbstractEventLoop] = None
# _queue: Optional[asyncio.Queue] = None

# def init_bridge(loop: asyncio.AbstractEventLoop, q: asyncio.Queue):
#     global _loop, _queue
#     _loop = loop
#     _queue = q

# def post(event: str, data=None):
#     if data is None:
#         data = ""
#     print(f"📡 BRIDGE EVENT: {event} -> {data}")
#     if _loop is None or _queue is None:
#         print("⚠️  Bridge not initialized yet — event dropped.")
#         return
#     # call_soon_threadsafe is the ONLY safe way to talk from a
#     # background thread (your voice loop) into an asyncio event loop
#     _loop.call_soon_threadsafe(_queue.put_nowait, {"type": event, "payload": data})


# bridge.py
import queue

msg_queue = queue.Queue()

def post(event: str, data=None):
    if data is None:
        data = ""
    print(f"📡 BRIDGE EVENT: {event} -> {data}")
    msg_queue.put({"type": event, "payload": data})