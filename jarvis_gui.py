"""
J.A.R.V.I.S. SCI-FI HUD OVERLAY
Cinematic Tkinter Interface with Animated Core, System Metrics, and Comms Log.
"""
import tkinter as tk
from tkinter import font as tkfont
import threading
import queue
import time
import psutil
import datetime
import os
import json
import math
import random

# ── COLOR PALETTE ───────────────────────────────────────────────────────────
BG      = "#05080f"  # Deep space black
GRID    = "#0a1526"  # Faint grid lines
CYAN    = "#00f0ff"  # Primary HUD color
BLUE    = "#0055ff"  
GREEN   = "#00ff66"  # Listening / Success
YELLOW  = "#ffcc00"  # Thinking / Warning
RED     = "#ff003c"  # Error / Close
TEXT    = "#a0c0d0"  # Standard text
DIM     = "#2a4050"  # Inactive elements

# ── SHARED EVENT QUEUE ──────────────────────────────────────────────────────
gui_queue = queue.Queue()

def post(event, data=None):
    """Called by main.py to push state updates to the GUI."""
    if data is None: data = ""
    gui_queue.put((event, data))

# ── HELPER: FAKE GLOW EFFECT ────────────────────────────────────────────────
def blend_color(hex_color, alpha):
    """Simulates opacity by blending a color with the background."""
    def parse(h): return tuple(int(h[i:i+2], 16) for i in (1,3,5))
    bg = parse(BG)
    c  = parse(hex_color)
    r = tuple(int(bg[i] + (c[i]-bg[i])*alpha) for i in range(3))
    return "#{:02x}{:02x}{:02x}".format(*r)

# ── THE ANIMATED CORE (CENTERPIECE) ─────────────────────────────────────────
class CoreCanvas(tk.Canvas):
    def __init__(self, parent, size=400):
        super().__init__(parent, width=size, height=size, bg=BG, highlightthickness=0)
        self.size = size
        self.c = size // 2
        self.angle = 0
        self.state = "idle"
        self.sonar_radius = 0
        self.bars = [random.randint(10, 40) for _ in range(12)]
        
    def set_state(self, state):
        if state != self.state:
            self.state = state
            if state == "listening": self.sonar_radius = 10
                
    def draw(self):
        self.delete("all")
        
        # 1. Background crosshairs
        self.create_line(self.c, 0, self.c, self.size, fill=GRID, dash=(2, 4))
        self.create_line(0, self.c, self.size, self.c, fill=GRID, dash=(2, 4))
        
        # 2. Outer static ring with degree ticks
        r_outer = 180
        self.create_oval(self.c-r_outer, self.c-r_outer, self.c+r_outer, self.c+r_outer, outline=DIM, width=1)
        
        color = CYAN
        speed = 1
        if self.state == "listening": color = GREEN
        elif self.state == "thinking": color = YELLOW; speed = 4
        elif self.state == "speaking": color = CYAN
        elif self.state == "error": color = RED
        
        for i in range(0, 360, 15):
            rad = math.radians(i + self.angle)
            x1 = self.c + math.cos(rad) * (r_outer - 5)
            y1 = self.c + math.sin(rad) * (r_outer - 5)
            x2 = self.c + math.cos(rad) * (r_outer + 5)
            y2 = self.c + math.sin(rad) * (r_outer + 5)
            self.create_line(x1, y1, x2, y2, fill=color, width=2)
            
        # 3. Inner rotating scanner line
        self.angle = (self.angle + speed) % 360
        rad = math.radians(self.angle)
        x = self.c + math.cos(rad) * r_outer
        y = self.c + math.sin(rad) * r_outer
        self.create_line(self.c, self.c, x, y, fill=color, width=2)
        
        # 4. Simulated Glow Effect (Concentric Rings)
        for i in range(4):
            r = 100 - (i * 20)
            alpha = 1.0 - (i * 0.25)
            c = blend_color(color, alpha)
            self.create_oval(self.c-r, self.c-r, self.c+r, self.c+r, outline=c, width=2)
            
        # 5. State-Specific Animations
        if self.state == "listening":
            # Sonar Pulse
            if self.sonar_radius < r_outer:
                self.sonar_radius += 8
                alpha = 1.0 - (self.sonar_radius / r_outer)
                c = blend_color(GREEN, alpha)
                self.create_oval(self.c-self.sonar_radius, self.c-self.sonar_radius, 
                                 self.c+self.sonar_radius, self.c+self.sonar_radius, outline=c, width=3)
            else:
                self.sonar_radius = 10
                
        elif self.state == "thinking":
            # Complex Geometry (Spinning Hexagon)
            r_inner = 60
            pts = []
            for i in range(6):
                a = math.radians(self.angle * 2 + i * 60)
                pts.extend([self.c + math.cos(a)*r_inner, self.c + math.sin(a)*r_inner])
            self.create_polygon(pts, outline=YELLOW, fill="", width=2)
            
        elif self.state == "speaking":
            # Audio Visualizer Waveform
            bar_width = 8
            gap = 6
            total_width = len(self.bars) * (bar_width + gap)
            start_x = self.c - total_width // 2
            for i, h in enumerate(self.bars):
                self.bars[i] = max(10, min(90, h + random.randint(-15, 15)))
                h = self.bars[i]
                x = start_x + i * (bar_width + gap)
                self.create_rectangle(x, self.c - h//2, x + bar_width, self.c + h//2, fill=CYAN, outline="")

# ── SYSTEM METRICS (LEFT PANEL) ─────────────────────────────────────────────
class SystemMetrics(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=BG)
        tk.Label(self, text="[ SYSTEM DIAGNOSTICS ]", bg=BG, fg=CYAN, font=("Consolas", 12, "bold")).pack(anchor="w", pady=(0, 10))
        
        self.cpu_canvas = tk.Canvas(self, width=150, height=150, bg=BG, highlightthickness=0)
        self.cpu_canvas.pack(pady=10)
        
        self.ram_canvas = tk.Canvas(self, width=150, height=150, bg=BG, highlightthickness=0)
        self.ram_canvas.pack(pady=10)
        
        self.info_text = tk.Text(self, bg=BG, fg=TEXT, font=("Consolas", 10), borderwidth=0, highlightthickness=0, width=22, height=6)
        self.info_text.pack(anchor="w", padx=10)
        self.info_text.config(state="disabled")
        
    def draw_gauge(self, canvas, value, label, color):
        canvas.delete("all")
        c = 75
        r = 60
        canvas.create_arc(c-r, c-r, c+r, c+r, start=90, extent=-360, outline=DIM, width=8, style="arc")
        canvas.create_arc(c-r, c-r, c+r, c+r, start=90, extent=- (value * 3.6), outline=color, width=8, style="arc")
        canvas.create_text(c, c-10, text=f"{int(value)}%", fill=color, font=("Consolas", 20, "bold"))
        canvas.create_text(c, c+15, text=label, fill=TEXT, font=("Consolas", 10))
        
    def update_metrics(self):
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        
        cpu_color = GREEN if cpu < 60 else YELLOW if cpu < 85 else RED
        ram_color = GREEN if ram < 60 else YELLOW if ram < 85 else RED
        
        self.draw_gauge(self.cpu_canvas, cpu, "CPU LOAD", cpu_color)
        self.draw_gauge(self.ram_canvas, ram, "MEMORY", ram_color)
        
        self.info_text.config(state="normal")
        self.info_text.delete("1.0", "end")
        net = psutil.net_io_counters()
        uptime = datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time())
        self.info_text.insert("end", f"UPTIME : {str(uptime).split('.')[0]}\n")
        self.info_text.insert("end", f"NET UP : {net.bytes_sent // 1024} KB\n")
        self.info_text.insert("end", f"NET DN : {net.bytes_recv // 1024} KB\n")
        self.info_text.insert("end", f"PROCS  : {len(psutil.pids())}\n")
        self.info_text.config(state="disabled")

# ── COMMS & DIRECTIVES (RIGHT PANEL) ────────────────────────────────────────
class CommsPanel(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=BG)
        tk.Label(self, text="[ COMMS LOG ]", bg=BG, fg=CYAN, font=("Consolas", 12, "bold")).pack(anchor="w", pady=(0, 5))
        
        self.log_text = tk.Text(self, bg=BG, fg=TEXT, font=("Consolas", 10), borderwidth=0, highlightthickness=0, wrap="word")
        self.log_text.pack(fill="both", expand=True, pady=(0, 15))
        self.log_text.config(state="disabled")
        
        self.log_text.tag_config("sys", foreground=DIM)
        self.log_text.tag_config("usr", foreground=GREEN)
        self.log_text.tag_config("jvs", foreground=CYAN)
        self.log_text.tag_config("body", foreground=TEXT)
        
        tk.Label(self, text="[ DIRECTIVES ]", bg=BG, fg=CYAN, font=("Consolas", 12, "bold")).pack(anchor="w", pady=(5, 5))
        self.todo_frame = tk.Frame(self, bg=BG)
        self.todo_frame.pack(fill="both", expand=True, anchor="w")
        
    def add_log(self, speaker, msg):
        self.log_text.config(state="normal")
        tag = "usr" if speaker == "user" else "jvs"
        prefix = "USR" if speaker == "user" else "JVS"
        self.log_text.insert("end", f"[{prefix}]> ", tag)
        self.log_text.insert("end", f"{msg}\n", "body")
        self.log_text.see("end")
        self.log_text.config(state="disabled")
        
    def update_todos(self, todos):
        for w in self.todo_frame.winfo_children():
            w.destroy()
        for t in todos:
            status = "[X]" if t["done"] else "[ ]"
            color = DIM if t["done"] else TEXT
            tk.Label(self.todo_frame, text=f"{status} {t['text']}", bg=BG, fg=color, font=("Consolas", 10), anchor="w").pack(fill="x", padx=10)

# ── MAIN APPLICATION WINDOW ─────────────────────────────────────────────────
class JarvisApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("J.A.R.V.I.S.")
        self.configure(bg=BG)
        self.geometry("1200x700")
        self.minsize(1000, 600)
        
        # Sci-Fi Window Settings (Borderless & Slightly Transparent)
        self.overrideredirect(True) 
        self.attributes("-alpha", 0.92) 
        self.attributes("-topmost", True)
        
        # Dragging Logic
        self.bind("<Button-1>", self.start_move)
        self.bind("<B1-Motion>", self.do_move)
        
        self._build_ui()
        self._boot_sequence()
        
        # Start Background Threads
        self._poll_queue()
        self._animate()
        self._update_metrics()
        self._data_stream()
        
        t = threading.Thread(target=self.run_jarvis_logic, daemon=True)
        t.start()

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def do_move(self, event):
        x = self.winfo_x() + event.x - self.x
        y = self.winfo_y() + event.y - self.y
        self.geometry(f"+{x}+{y}")

    def _build_ui(self):
        # Close Button
        close_btn = tk.Label(self, text="[ X ]", bg=BG, fg=RED, font=("Consolas", 14, "bold"))
        close_btn.place(relx=1.0, x=-40, y=10)
        close_btn.bind("<Button-1>", lambda e: self.destroy())
        
        # Top Status Bar
        top_bar = tk.Frame(self, bg=BG, height=40)
        top_bar.pack(fill="x", side="top", padx=20, pady=10)
        tk.Label(top_bar, text="J.A.R.V.I.S. // LOCAL NEURAL NET", bg=BG, fg=CYAN, font=("Consolas", 16, "bold")).pack(side="left")
        
        self.time_lbl = tk.Label(top_bar, bg=BG, fg=TEXT, font=("Consolas", 12))
        self.time_lbl.pack(side="right")
        self._tick_time()
        
        # Main Layout (3 Columns)
        main_grid = tk.Frame(self, bg=BG)
        main_grid.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Left: Metrics
        self.metrics = SystemMetrics(main_grid)
        self.metrics.pack(side="left", fill="y", padx=(0, 20))
        
        # Center: Core & Status
        center_frame = tk.Frame(main_grid, bg=BG)
        center_frame.pack(side="left", fill="both", expand=True)
        
        self.core = CoreCanvas(center_frame, size=400)
        self.core.pack(expand=True)
        
        self.status_lbl = tk.Label(center_frame, text="> AWAITING INPUT_", bg=BG, fg=CYAN, font=("Consolas", 14, "bold"))
        self.status_lbl.pack(pady=20)
        
        # Right: Comms & Todos
        self.comms = CommsPanel(main_grid)
        self.comms.pack(side="right", fill="y", padx=(20, 0), ipadx=10)
        
    def _boot_sequence(self):
        self.boot_frame = tk.Frame(self, bg=BG)
        self.boot_frame.place(relwidth=1, relheight=1)
        self.terminal = tk.Label(self.boot_frame, bg=BG, fg=GREEN, font=("Consolas", 14), anchor="nw", justify="left")
        self.terminal.pack(fill="both", expand=True, padx=50, pady=50)
        
        lines = [
            "> INITIALIZING NEURAL NETWORK...",
            "> LOADING LANGUAGE MODEL [qwen3:1.7b]...",
            "> CALIBRATING AUDIO SENSORS...",
            "> ESTABLISHING SECURE UPLINK...",
            "> SYSTEM ONLINE."
        ]
        
        def type_line(idx=0):
            if idx < len(lines):
                self.terminal.config(text=self.terminal.cget("text") + "\n" + lines[idx])
                self.after(500, lambda: type_line(idx + 1))
            else:
                self.after(800, self.boot_frame.destroy)
        type_line()

    def _tick_time(self):
        now = datetime.datetime.now().strftime("%Y-%m-%d  %H:%M:%S")
        self.time_lbl.config(text=now)
        self.after(1000, self._tick_time)
        
    def _data_stream(self):
        """Random hex data in the bottom left corner for that cinematic feel."""
        if not hasattr(self, 'stream_lbl'):
            self.stream_lbl = tk.Label(self, bg=BG, fg=DIM, font=("Consolas", 8), anchor="sw")
            self.stream_lbl.place(x=10, rely=1.0, y=-10)
            
        hex_str = "".join([random.choice("0123456789ABCDEF") for _ in range(40)])
        self.stream_lbl.config(text=f"0x{hex_str}")
        self.after(150, self._data_stream)

    def _animate(self):
        self.core.draw()
        self.after(33, self._animate) # ~30 FPS
        
    def _update_metrics(self):
        self.metrics.update_metrics()
        self.after(2000, self._update_metrics)

    def _poll_queue(self):
        try:
            while True:
                event, data = gui_queue.get_nowait()
                if event == "status":
                    self.core.set_state(data)
                    txt = {
                        "idle": "> AWAITING INPUT_",
                        "listening": "> LISTENING...",
                        "thinking": "> PROCESSING NEURAL NET...",
                        "speaking": "> TRANSMITTING AUDIO_",
                        "error": "> ERROR ENCOUNTERED_"
                    }.get(data, "> AWAITING INPUT_")
                    self.status_lbl.config(text=txt)
                elif event == "log":
                    speaker, msg = data
                    self.comms.add_log(speaker, msg)
                elif event in ["todo_add", "todo_remove", "todo_complete"]:
                    self._reload_todos()
        except queue.Empty:
            pass
        self.after(100, self._poll_queue)
        
    def _reload_todos(self):
        try:
            todo_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jarvis_todos.json")
            with open(todo_file, "r") as f:
                todos = json.load(f)
            self.comms.update_todos(todos)
        except:
            pass

    def run_jarvis_logic(self):
        """
        This is where your main.py logic runs in the background.
        We import it safely here so it doesn't block the GUI thread.
        """
        try:
            # Suppress stdout during import
            import importlib.util, io, contextlib
            spec = importlib.util.spec_from_file_location("main", "main.py")
            main_module = importlib.util.module_from_spec(spec)
            
            # Monkey-patch the post function so main.py uses OUR queue
            main_module.post = post 
            
            with contextlib.redirect_stdout(io.StringIO()):
                spec.loader.exec_module(main_module)
                
            # Start the actual voice loop
            main_module.write()
        except Exception as e:
            post("log", ("jarvis", f"Critical system error: {str(e)}"))
            post("status", "error")

if __name__ == "__main__":
    app = JarvisApp()
    app.mainloop()