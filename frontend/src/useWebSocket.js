import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [state, setState] = useState('idle');
  const [logs, setLogs]   = useState([]);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0 });
  const wsRef = useRef(null);

  useEffect(() => {
    let retryTimeout;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => console.log('⚡ Connected to Jarvis Core');

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'status':
              setState(msg.payload);
              break;
            case 'log':
              // payload is the Python tuple serialized as a JSON array: ["jarvis", "text"]
              // msg.payload = ["user" | "jarvis", "the text string"]
              setLogs(prev => [...prev, msg.payload]);
              break;
            case 'metrics':
              setMetrics(msg.payload);
              break;
            default:
              break;
          }
        } catch (e) {
          console.error('❌ Failed to parse WS message:', e, event.data);
        }
      };

      ws.onerror = (e) => console.error('❌ WebSocket error:', e);

      ws.onclose = () => {
        console.warn('🔌 Disconnected — retrying in 2s...');
        retryTimeout = setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, [url]);

  return { state, logs, metrics };
}