import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [state, setState] = useState('idle'); // idle, listening, thinking, speaking
  const [logs, setLogs] = useState([]);       // Conversation history
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0 });
  const ws = useRef(null);

  useEffect(() => {
    // Connect to the FastAPI server
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log("⚡ Connected to Jarvis Core");
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Route Python events to React state
      switch (message.type) {
        case 'status':
          setState(message.payload);
          break;
        case 'log':
          setLogs((prev) => [...prev, message.payload]);
          break;
        case 'metrics':
          setMetrics(message.payload);
          break;
        default:
          break;
      }
    };

    ws.current.onclose = () => {
      console.log("❌ Disconnected from Jarvis Core");
    };

    return () => {
      ws.current.close();
    };
  }, [url]);

  return { state, logs, metrics };
}