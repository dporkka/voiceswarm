"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface WSMessage {
  type: "agent_status" | "task_update" | "workflow_event" | "log" | "cost_update" | "ping";
  payload: Record<string, unknown>;
  timestamp: string;
}

export function useWebSocket(url?: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const wsUrl = url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("[WebSocket] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          setLastMessage(msg);
        } catch {
          console.warn("[WebSocket] Failed to parse message:", event.data);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("[WebSocket] Disconnected");
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        setConnected(false);
      };
    } catch (err) {
      console.error("[WebSocket] Connection failed:", err);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setConnected(false);
  }, []);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    // Auto-connect disabled - connect manually when needed
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connected,
    lastMessage,
    connect,
    disconnect,
    send,
  };
}

export function useAgentStream() {
  const { connected, lastMessage, connect, disconnect, send } = useWebSocket();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    lastEvent: lastMessage?.type === "agent_status" ? lastMessage : null,
    connect,
    disconnect,
    send,
  };
}
