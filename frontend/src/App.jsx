// frontend/src/App.jsx
import { useWebSocket } from './useWebSocket';
import { useEffect, useRef } from 'react';

function App() {
  const { state, logs, metrics } = useWebSocket('ws://localhost:8000/ws');
  const logEndRef = useRef(null);

  // Map Python states to Tailwind/CSS classes
  const stateConfig = {
    idle:      { color: 'cyan', text: 'AWAITING INPUT', ring: 'border-cyan-500/50' },
    listening: { color: 'green', text: 'LISTENING...', ring: 'border-green-500 shadow-[0_0_50px_#22c55e]' },
    thinking:  { color: 'yellow', text: 'PROCESSING...', ring: 'border-yellow-500 shadow-[0_0_50px_#eab308] animate-spin' },
    speaking:  { color: 'blue', text: 'TRANSMITTING...', ring: 'border-blue-500 shadow-[0_0_50px_#3b82f6] animate-pulse' },
    error:     { color: 'red', text: 'SYSTEM ERROR', ring: 'border-red-500' }
  };

  const current = stateConfig[state] || stateConfig.idle;

  // Auto-scroll chat log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#05080f] text-cyan-400 font-mono p-8 flex flex-col items-center overflow-hidden relative">
      
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* 1. THE INTERACTIVE CORE */}
      <div className="relative z-10 flex flex-col items-center mb-12">
        <div className={`w-48 h-48 rounded-full border-4 ${current.ring} flex items-center justify-center transition-all duration-500 bg-black/40 backdrop-blur-sm`}>
          <div className={`w-32 h-32 rounded-full border-2 border-${current.color}-400/30 flex items-center justify-center`}>
            <h1 className={`text-2xl font-bold uppercase tracking-widest text-${current.color}-400`}>
              {current.text}
            </h1>
          </div>
        </div>
      </div>

      {/* 2. SYSTEM METRICS BAR */}
      <div className="relative z-10 flex gap-8 mb-8 text-sm w-full max-w-2xl">
        <div className="flex-1 border border-cyan-900/50 p-4 rounded bg-black/60 backdrop-blur-md">
          <div className="flex justify-between text-gray-500 mb-1">
            <span>CPU LOAD</span>
            <span className="text-cyan-400">{metrics.cpu}%</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-1000" style={{width: `${metrics.cpu}%`}}></div>
          </div>
        </div>
        <div className="flex-1 border border-cyan-900/50 p-4 rounded bg-black/60 backdrop-blur-md">
          <div className="flex justify-between text-gray-500 mb-1">
            <span>MEMORY</span>
            <span className="text-cyan-400">{metrics.ram}%</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-1000" style={{width: `${metrics.ram}%`}}></div>
          </div>
        </div>
      </div>

      {/* 3. LIVE COMMS TERMINAL */}
      <div className="relative z-10 w-full max-w-2xl h-80 border border-cyan-900/50 rounded bg-black/80 backdrop-blur-md flex flex-col shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        <div className="p-3 border-b border-cyan-900/50 flex justify-between items-center bg-cyan-900/10">
          <span className="text-xs font-bold tracking-widest text-cyan-500">◈ LIVE COMMS LOG</span>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 text-sm space-y-3 custom-scrollbar">
          {logs.length === 0 && (
            <p className="text-gray-600 italic">Awaiting transmission...</p>
          )}
          {logs.map((log, index) => {
            const isUser = log[0] === 'user';
            return (
              <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <span className="text-cyan-500 font-bold shrink-0">[JVS]</span>}
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  isUser 
                    ? 'bg-green-900/20 border border-green-500/30 text-green-300' 
                    : 'bg-cyan-900/10 border border-cyan-500/20 text-gray-300'
                }`}>
                  {log[1]}
                </div>
                {isUser && <span className="text-green-500 font-bold shrink-0">[USR]</span>}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>

    </div>
  );
}

export default App;