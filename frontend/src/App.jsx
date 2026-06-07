import { useWebSocket } from "./useWebSocket";
import { useEffect, useRef, useState } from "react";

export default function App() {
  const { state, logs, metrics } = useWebSocket("ws://localhost:8000/ws");
  const logEndRef = useRef(null);
  const canvasRef = useRef(null);
  const waveStateRef = useRef("idle");
  const waveAmpRef = useRef(2);
  const waveTargetRef = useRef(2);
  const tRef = useRef(0);
  const [cpuDisplay, setCpuDisplay] = useState(0);
  const [ramDisplay, setRamDisplay] = useState(0);
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [clock, setClock] = useState("");
  const [streamLines, setStreamLines] = useState([
    "Neural pathway verified.",
    "Scanning freq. 2.4GHz...",
    "Auth layer intact.",
    "Perimeter clear.",
    "Uplink: 40 Gbps stable.",
  ]);
  const [hexStates, setHexStates] = useState(() =>
    Array.from({ length: 48 }, () => (Math.random() > 0.3 ? 0.3 : 0.06)),
  );
  const startTimeRef = useRef(Date.now());

  const DATA_LINES = [
    "Neural pathway verified.",
    "Scanning freq. 2.4GHz...",
    "Auth layer intact.",
    "Perimeter clear.",
    "Uplink: 40 Gbps stable.",
    "Threat level: minimal.",
    "Kernel heartbeat: 200ms.",
    "Route optimized.",
    "Subnet 10.0.7.x nominal.",
    "Cache: 98% hit rate.",
    "Firewall rules updated.",
    "TLS handshake success.",
  ];
  const streamIdxRef = useRef(0);

  const stateConfig = {
    idle: {
      stateText: "AWAITING INPUT",
      statusText: "IDLE",
      statusColor: "#3a7a8e",
      circleGlow: "rgba(0,212,255,0.2)",
      borderColor: "rgba(0,212,255,0.4)",
      amp: 2,
    },
    listening: {
      stateText: "LISTENING",
      statusText: "ACTIVE",
      statusColor: "#00ff88",
      circleGlow: "rgba(0,255,136,0.4)",
      borderColor: "rgba(0,255,136,0.6)",
      amp: 22,
    },
    thinking: {
      stateText: "PROCESSING",
      statusText: "THINKING",
      statusColor: "#ffe000",
      circleGlow: "rgba(255,224,0,0.4)",
      borderColor: "rgba(255,224,0,0.6)",
      amp: 10,
    },
    speaking: {
      stateText: "TRANSMITTING",
      statusText: "SPEAKING",
      statusColor: "#00d4ff",
      circleGlow: "rgba(0,212,255,0.5)",
      borderColor: "rgba(0,212,255,0.8)",
      amp: 28,
    },
    error: {
      stateText: "SYSTEM ERROR",
      statusText: "ERROR",
      statusColor: "#ff3355",
      circleGlow: "rgba(255,51,85,0.3)",
      borderColor: "rgba(255,51,85,0.6)",
      amp: 2,
    },
  };
  const current = stateConfig[state] || stateConfig.idle;

  // Sync wave state
  useEffect(() => {
    waveStateRef.current = state || "idle";
    waveTargetRef.current = current.amp;
  }, [state]);

  // Waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, 560, 88);
      waveAmpRef.current += (waveTargetRef.current - waveAmpRef.current) * 0.08;
      const ws = waveStateRef.current;
      const amp = waveAmpRef.current;
      const lines = ws === "listening" ? 3 : 1;
      for (let l = 0; l < lines; l++) {
        ctx.beginPath();
        const alpha = l === 0 ? 1 : 0.3 - l * 0.1;
        ctx.strokeStyle =
          ws === "listening"
            ? `rgba(0,255,136,${alpha})`
            : ws === "thinking"
              ? `rgba(255,224,0,${alpha})`
              : ws === "speaking"
                ? `rgba(0,212,255,${alpha})`
                : `rgba(0,144,204,${alpha})`;
        ctx.lineWidth = l === 0 ? 1.5 : 0.8;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        for (let x = 0; x <= 560; x += 2) {
          const f1 = ws === "thinking" ? 0.035 : 0.025;
          const y =
            44 +
            Math.sin(x * f1 + tRef.current * 2 + l * 0.3) * amp +
            Math.sin(x * 0.06 + tRef.current * 3.1 + l * 0.5) * (amp * 0.4);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,212,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 0;
      ctx.moveTo(0, 44);
      ctx.lineTo(560, 44);
      ctx.stroke();
      tRef.current += 0.04;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Clock
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Session timer
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, "0");
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setSessionTime(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Metrics display
  useEffect(() => {
    if (metrics?.cpu !== undefined) setCpuDisplay(Math.round(metrics.cpu));
    if (metrics?.ram !== undefined) setRamDisplay(Math.round(metrics.ram));
  }, [metrics]);

  // Data stream
  useEffect(() => {
    const id = setInterval(() => {
      const line = DATA_LINES[streamIdxRef.current % DATA_LINES.length];
      streamIdxRef.current++;
      setStreamLines((prev) => [...prev.slice(-4), line]);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // Hex map flicker
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * 48);
      setHexStates((prev) => {
        const next = [...prev];
        next[idx] = 0.7;
        return next;
      });
      setTimeout(() => {
        setHexStates((prev) => {
          const next = [...prev];
          next[idx] = 0.15;
          return next;
        });
      }, 600);
    }, 400);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const queryCount = logs?.filter((l) => l[0] === "user").length ?? 0;

  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        background: "#020b14",
        color: "#7de8ff",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #003a50; border-radius: 2px; }
        @keyframes spin1 { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes spin2 { from{transform:translate(-50%,-50%) rotate(120deg)} to{transform:translate(-50%,-50%) rotate(480deg)} }
        @keyframes spin3 { from{transform:translate(-50%,-50%) rotate(240deg)} to{transform:translate(-50%,-50%) rotate(600deg)} }
        @keyframes spin4 { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(-360deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes load-sweep { 0%{transform:translateX(-200%)} 100%{transform:translateX(400%)} }
        @keyframes msg-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes warn-blink { 0%,15%,30%,100%{opacity:0} 5%,20%{opacity:1} }
        @keyframes ticker { from{transform:translateX(200px)} to{transform:translateX(-100%)} }
        @keyframes core-think { from{transform:translate(-50%,-50%) scale(1)} to{transform:translate(-50%,-50%) scale(1.04)} }
        @keyframes core-pulse { from{transform:translate(-50%,-50%) scale(1)} to{transform:translate(-50%,-50%) scale(1.06)} }
        .orbit-ring-1 { animation: spin1 8s linear infinite; }
        .orbit-ring-2 { animation: spin2 12s linear infinite; }
        .orbit-ring-3 { animation: spin3 6s linear infinite; }
        .orbit-ring-4 { animation: spin4 4s linear infinite; }
        .core-thinking { animation: core-think 1s ease-in-out infinite alternate; }
        .core-speaking  { animation: core-pulse 0.8s ease-in-out infinite alternate; }
        .load-fill { animation: load-sweep 2.4s ease-in-out infinite; }
        .load-fill-2 { animation: load-sweep 2.4s ease-in-out -1.2s infinite; }
        .warn-flash { animation: warn-blink 3s ease-in-out 4s infinite; }
        .ticker-inner { animation: ticker 18s linear infinite; }
        .ping-dot { animation: pulse-dot 1.2s infinite; }
        .dot-pulse { animation: pulse-dot 2s infinite; }
      `}</style>

      {/* BG Grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.04) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(2,11,20,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)",
        }}
      />

      {/* MAIN HUD GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "260px 1fr 260px",
          gridTemplateRows: "auto 1fr auto",
          gap: "10px",
          padding: "12px 18px",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 14px",
            background: "rgba(0,10,20,0.85)",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: "6px",
            backdropFilter: "blur(10px)",
          }}
        >
          <span
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: "11px",
              letterSpacing: "5px",
              color: "#00d4ff",
              textTransform: "uppercase",
            }}
          >
            J.A.R.V.I.S. — Integrated Scientific Interface v9.4.2
          </span>
          <div
            style={{
              display: "flex",
              gap: "20px",
              fontSize: "10px",
              color: "#3a7a8e",
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div
                className="dot-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00ff88",
                  boxShadow: "0 0 6px #00ff88",
                }}
              />
              CORE ONLINE
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div
                className="dot-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ffe000",
                  boxShadow: "0 0 6px #ffe000",
                  animationDelay: "0.5s",
                }}
              />
              SECTOR 7 ALERT
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div
                className="dot-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00ff88",
                  boxShadow: "0 0 6px #00ff88",
                  animationDelay: "1s",
                }}
              />
              COMMS ACTIVE
            </span>
            <span
              style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: "9px",
                color: "#00d4ff",
              }}
            >
              {clock}
            </span>
          </div>
        </div>

        {/* ── LEFT COLUMN ── */}
        <div
          style={{
            gridColumn: "1",
            gridRow: "2",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* Telemetry */}
          <Panel label="System Telemetry">
            {[
              {
                label: "CPU LOAD",
                val: cpuDisplay,
                color: "#00d4ff",
                glow: "#00d4ff",
              },
              {
                label: "MEMORY",
                val: ramDisplay,
                color: "#00ffee",
                glow: "#00ffee",
              },
              {
                label: "NEURAL LINK",
                val: 92,
                color: "#00ff88",
                glow: "#00ff88",
                statusLabel: "STABLE",
                statusColor: "#00ff88",
              },
            ].map(({ label, val, color, glow, statusLabel, statusColor }) => (
              <div key={label} style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "9px",
                    color: "#3a7a8e",
                    marginBottom: "5px",
                    letterSpacing: "2px",
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: statusColor || color }}>
                    {statusLabel || `${val}%`}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "3px",
                    background: "rgba(0,212,255,0.08)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${val}%`,
                      background: `linear-gradient(90deg, ${color}55, ${color})`,
                      boxShadow: `0 0 6px ${glow}`,
                      borderRadius: "2px",
                      transition: "width 1s ease",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "-1px",
                        bottom: "-1px",
                        width: "4px",
                        background: "white",
                        borderRadius: "2px",
                        boxShadow: `0 0 6px ${glow}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div
              style={{
                height: "2px",
                background: "rgba(0,212,255,0.08)",
                borderRadius: "1px",
                overflow: "hidden",
                marginTop: "4px",
              }}
            >
              <div
                className="load-fill"
                style={{
                  height: "100%",
                  width: "40%",
                  background: "linear-gradient(90deg,transparent,#00d4ff)",
                  borderRadius: "1px",
                }}
              />
            </div>
          </Panel>

          {/* Stats */}
          <Panel label="Combat Stats">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {[
                { val: "3", label: "THREATS", color: "#00d4ff" },
                { val: "99.9%", label: "UPTIME", color: "#00ff88" },
                { val: `${queryCount}`, label: "QUERIES", color: "#00ffee" },
                { val: "4.7ms", label: "LATENCY", color: "#ffe000" },
              ].map(({ val, label, color }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(0,212,255,0.04)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    borderRadius: "5px",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Orbitron',sans-serif",
                      fontSize: "16px",
                      fontWeight: 700,
                      color,
                      textShadow: `0 0 10px ${color}66`,
                    }}
                  >
                    {val}
                  </div>
                  <div
                    style={{
                      fontSize: "8px",
                      color: "#3a7a8e",
                      letterSpacing: "2px",
                      marginTop: "2px",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Data Stream */}
          <Panel label="Data Stream" style={{ flex: 1, minHeight: 0 }}>
            <div
              style={{
                fontSize: "8px",
                color: "#3a7a8e",
                letterSpacing: "1px",
                lineHeight: 1.8,
                flex: 1,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {streamLines.map((line, i) => (
                <div key={i} style={{ opacity: 0.4 + i * 0.12 }}>
                  {line}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "24px",
                  background:
                    "linear-gradient(transparent, rgba(0,20,35,0.75))",
                }}
              />
            </div>
            <div
              style={{
                height: "2px",
                background: "rgba(0,212,255,0.08)",
                borderRadius: "1px",
                overflow: "hidden",
                marginTop: "8px",
              }}
            >
              <div
                className="load-fill-2"
                style={{
                  height: "100%",
                  width: "40%",
                  background: "linear-gradient(90deg,transparent,#00d4ff)",
                  borderRadius: "1px",
                }}
              />
            </div>
          </Panel>
        </div>

        {/* ── CENTER CORE ── */}
        <div
          style={{
            gridColumn: "2",
            gridRow: "2",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* Orbital system */}
          <div
            style={{
              position: "relative",
              width: "280px",
              height: "280px",
              flexShrink: 0,
            }}
          >
            {/* Ring 1 */}
            <div
              className="orbit-ring-1"
              style={{
                position: "absolute",
                width: "280px",
                height: "280px",
                borderRadius: "50%",
                border: "1px solid rgba(0,212,255,0.15)",
                borderTopColor: "#00d4ff",
                top: "50%",
                left: "50%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#00d4ff",
                  boxShadow: "0 0 8px #00d4ff, 0 0 16px rgba(0,212,255,0.5)",
                  top: "-3px",
                  left: "50%",
                  marginLeft: "-3px",
                }}
              />
            </div>
            {/* Ring 2 */}
            <div
              className="orbit-ring-2"
              style={{
                position: "absolute",
                width: "240px",
                height: "240px",
                borderRadius: "50%",
                border: "1px solid rgba(0,255,238,0.1)",
                borderBottomColor: "#00ffee",
                top: "50%",
                left: "50%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#00ffee",
                  boxShadow: "0 0 8px #00ffee",
                  top: "-2.5px",
                  left: "50%",
                  marginLeft: "-2.5px",
                }}
              />
            </div>
            {/* Ring 3 */}
            <div
              className="orbit-ring-3"
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1px solid rgba(0,144,204,0.15)",
                borderRightColor: "#0090cc",
                top: "50%",
                left: "50%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#0090cc",
                  boxShadow: "0 0 6px #0090cc",
                  top: "-2px",
                  left: "50%",
                  marginLeft: "-2px",
                }}
              />
            </div>
            {/* Ring 4 */}
            <div
              className="orbit-ring-4"
              style={{
                position: "absolute",
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                border: "1px solid rgba(0,212,255,0.1)",
                borderBottomColor: "rgba(0,212,255,0.5)",
                top: "50%",
                left: "50%",
              }}
            />

            {/* Core Circle */}
            <div
              className={
                state === "thinking"
                  ? "core-thinking"
                  : state === "speaking"
                    ? "core-speaking"
                    : ""
              }
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 40% 35%, rgba(0,212,255,0.15), rgba(0,10,20,0.95))",
                border: `1px solid ${current.borderColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                boxShadow: `0 0 30px ${current.circleGlow}, 0 0 60px ${current.circleGlow.replace("0.", "0.0")}, inset 0 0 20px ${current.circleGlow.replace("0.4", "0.05")}`,
                transition: "box-shadow 0.5s, border-color 0.5s",
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron',sans-serif",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  color: "#00d4ff",
                  textShadow: "0 0 10px #00d4ff",
                  textAlign: "center",
                }}
              >
                J.A.R.V.I.S
              </div>
              <div
                style={{
                  fontSize: "7px",
                  letterSpacing: "3px",
                  color: current.statusColor,
                  textShadow: `0 0 8px ${current.statusColor}`,
                  marginTop: "4px",
                  textTransform: "uppercase",
                  textAlign: "center",
                  transition: "color 0.5s",
                }}
              >
                {current.statusText}
              </div>
            </div>
          </div>

          {/* State label */}
          <div
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: "12px",
              letterSpacing: "5px",
              textTransform: "uppercase",
              color: "#00d4ff",
              textShadow: "0 0 20px #00d4ff",
              marginTop: "14px",
              textAlign: "center",
              transition: "color 0.5s",
            }}
          >
            {current.stateText}
          </div>

          {/* Waveform */}
          <div
            style={{
              width: "280px",
              height: "44px",
              marginTop: "10px",
              flexShrink: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              width={560}
              height={88}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>

          {/* Signal + warn row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "280px",
              marginTop: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "8px",
                  letterSpacing: "2px",
                  color: "#3a7a8e",
                }}
              >
                SIGNAL
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "2px",
                  height: "16px",
                }}
              >
                {[4, 7, 10, 13, 16].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: "5px",
                      height: `${h}px`,
                      background: "#00d4ff",
                      borderRadius: "1px",
                      boxShadow: "0 0 4px rgba(0,212,255,0.6)",
                      opacity: i < 4 ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
            <span
              className="warn-flash"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "9px",
                letterSpacing: "2px",
                color: "#ffe000",
                textShadow: "0 0 8px #ffe000",
                opacity: 0,
              }}
            >
              ⚠ SECTOR 7 BREACH
            </span>
            <span
              style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: "9px",
                color: "#00d4ff",
              }}
            >
              {sessionTime}
            </span>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div
          style={{
            gridColumn: "3",
            gridRow: "2",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* Hex map */}
          <Panel label="Network Topology">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: "4px",
              }}
            >
              {hexStates.map((opacity, i) => (
                <div
                  key={i}
                  style={{
                    width: "12px",
                    height: "12px",
                    clipPath:
                      "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)",
                    background: `rgba(0,212,255,${opacity})`,
                    transition: "background 0.5s",
                  }}
                />
              ))}
            </div>
          </Panel>

          {/* Comms log */}
          <Panel
            label="Live Comms Log"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                minHeight: 0,
              }}
            >
              {!logs || logs.length === 0 ? (
                <div
                  style={{
                    fontSize: "9px",
                    color: "#3a7a8e",
                    letterSpacing: "2px",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "10px 0",
                  }}
                >
                  Awaiting transmission...
                </div>
              ) : (
                logs.map((log, i) => {
                  const isUser = log[0] === "user";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                        animation: "msg-in 0.3s ease",
                      }}
                    >
                      {!isUser && (
                        <span
                          style={{
                            fontSize: "8px",
                            letterSpacing: "2px",
                            color: "#00d4ff",
                            whiteSpace: "nowrap",
                            paddingTop: "2px",
                            flexShrink: 0,
                          }}
                        >
                          [JVS]
                        </span>
                      )}
                      <div
                        style={{
                          fontSize: "10px",
                          lineHeight: 1.5,
                          padding: "6px 9px",
                          borderRadius: "5px",
                          flex: 1,
                          background: isUser
                            ? "rgba(0,255,136,0.05)"
                            : "rgba(0,212,255,0.05)",
                          border: isUser
                            ? "1px solid rgba(0,255,136,0.15)"
                            : "1px solid rgba(0,212,255,0.12)",
                          color: isUser
                            ? "rgba(0,255,136,0.85)"
                            : "rgba(0,212,255,0.8)",
                        }}
                      >
                        {log[1]}
                      </div>
                      {isUser && (
                        <span
                          style={{
                            fontSize: "8px",
                            letterSpacing: "2px",
                            color: "#00ff88",
                            whiteSpace: "nowrap",
                            paddingTop: "2px",
                            flexShrink: 0,
                          }}
                        >
                          [USR]
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </Panel>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "7px 14px",
            background: "rgba(0,10,20,0.85)",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: "6px",
            fontSize: "8px",
            letterSpacing: "2px",
            color: "#3a7a8e",
          }}
        >
          {[
            ["SECTOR", "ALPHA-7"],
            ["PROTOCOL", "STARK-OS"],
            ["CLEARANCE", "OMEGA"],
          ].map(([k, v]) => (
            <span
              key={k}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              {k}{" "}
              <span
                style={{
                  color: "#00d4ff",
                  fontFamily: "'Orbitron',sans-serif",
                  fontSize: "9px",
                }}
              >
                {v}
              </span>
              <span style={{ color: "#003a50", marginLeft: "6px" }}>|</span>
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="ping-dot"
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 6px #00ff88",
                display: "inline-block",
              }}
            />
            <span
              style={{
                color: "#00d4ff",
                fontFamily: "'Orbitron',sans-serif",
                fontSize: "9px",
              }}
            >
              WS LINK
            </span>
          </span>
          <div
            style={{
              marginLeft: "auto",
              overflow: "hidden",
              whiteSpace: "nowrap",
              width: "200px",
              position: "relative",
            }}
          >
            <span
              className="ticker-inner"
              style={{
                display: "inline-block",
                fontFamily: "'Orbitron',sans-serif",
                fontSize: "7px",
                color: "rgba(0,212,255,0.4)",
                letterSpacing: "3px",
              }}
            >
              ◈ ALL SYSTEMS NOMINAL ◈ NEURAL NET ACTIVE ◈ ENCRYPTION: AES-512 ◈
              UPLINK: 40GBPS ◈ AUTH: VERIFIED ◈
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Panel component ──
function Panel({ label, children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(0,20,35,0.75)",
        border: "1px solid rgba(0,212,255,0.2)",
        borderRadius: "8px",
        backdropFilter: "blur(12px)",
        position: "relative",
        padding: "14px",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg,transparent,#00d4ff,transparent)",
          opacity: 0.6,
        }}
      />
      {/* Corner brackets */}
      {[
        ["0", "0", "top", "left"],
        ["0", "0", "top", "right"],
        ["auto", "0", "bottom", "left"],
        ["auto", "0", "bottom", "right"],
      ].map(([t, b, tv, lv], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "10px",
            height: "10px",
            [tv]: 0,
            [lv]: 0,
            borderTop: tv === "top" ? "1px solid rgba(0,212,255,0.5)" : "none",
            borderBottom:
              tv === "bottom" ? "1px solid rgba(0,212,255,0.5)" : "none",
            borderLeft:
              lv === "left" ? "1px solid rgba(0,212,255,0.5)" : "none",
            borderRight:
              lv === "right" ? "1px solid rgba(0,212,255,0.5)" : "none",
            pointerEvents: "none",
          }}
        />
      ))}
      <div
        style={{
          fontFamily: "'Orbitron',sans-serif",
          fontSize: "9px",
          letterSpacing: "3px",
          color: "#0090cc",
          textTransform: "uppercase",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span style={{ color: "#00d4ff", fontSize: "8px" }}>◈</span>
        {label}
      </div>
      {children}
    </div>
  );
}
