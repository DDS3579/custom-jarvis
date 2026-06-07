# bridge.py
import queue

# Thread-safe queue for messages
msg_queue = queue.Queue()

def post(event, data=None):
    """Called by main.py to send events to the React GUI"""
    if data is None: data = ""
    print(f"📡 BRIDGE EVENT: {event} -> {data}")
    msg_queue.put({"type": event, "payload": data})