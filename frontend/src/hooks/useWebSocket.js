import { useState, useEffect, useRef } from "react";

export default function useWebSocket(url) {
  const ws = useRef(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    ws.current = new WebSocket(url);
    ws.current.onopen = () => console.log("WS connected");
    ws.current.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      setMessages((prev) => [...prev, data]);
    };
    ws.current.onclose = () => console.log("WS disconnected");
    return () => ws.current.close();
  }, [url]);

  const sendMessage = (msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  return { messages, sendMessage };
}
