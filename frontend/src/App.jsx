// src/App.jsx
import { useWebSocket } from './useWebSocket';

function App() {
  // Connect to Python backend
  const { state, logs, metrics } = useWebSocket('ws://localhost:8000/ws');

  // Map Python states to UI colors
  const stateColors = {
    idle: 'text-cyan-400',
    listening: 'text-green-400 animate-pulse',
    thinking: 'text-yellow-400 animate-spin',
    speaking: 'text-blue-400',
    error: 'text-red-500'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#05080f] font-mono">
      
      {/* 1. THE CORE (Replace this div with your 3D Orb / Canvas) */}
      <div className={`w-64 h-64 rounded-full border-4 ${stateColors[state]} flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(0,240,255,0.5)]`}>
        <h1 className="text-4xl font-bold uppercase tracking-widest">{state}</h1>
      </div>

      {/* 2. SYSTEM METRICS */}
      <div className="flex gap-8 mb-8 text-sm">
        <div className="border border-cyan-900 p-4 rounded bg-black/50">
          <p className="text-gray-500">CPU LOAD</p>
          <p className="text-2xl text-cyan-400">{metrics.cpu}%</p>
        </div>
        <div className="border border-cyan-900 p-4 rounded bg-black/50">
          <p className="text-gray-500">MEMORY</p>
          <p className="text-2xl text-cyan-400">{metrics.ram}%</p>
        </div>
      </div>

      {/* 3. COMMS LOG */}
      <div className="w-full max-w-2xl h-64 overflow-y-auto border border-cyan-900 p-4 rounded bg-black/50 text-sm">
        {logs.map((log, index) => (
          <div key={index} className="mb-2">
            <span className={log[0] === 'user' ? 'text-green-400 font-bold' : 'text-cyan-400 font-bold'}>
              [{log[0].toUpperCase()}]
            </span>
            <span className="text-gray-300 ml-2">{log[1]}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;