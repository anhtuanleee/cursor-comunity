"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useUser } from "./user-provider";
import type { ClientMessage, ServerMessage } from "@/lib/types";

const WS_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:8787";
const MAX_RECONNECT_DELAY = 10_000;

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  onlineCount: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineCount: 0,
});

function createSocketUrl(host: string): string {
  const normalized = host.replace(/\/+$/, "");
  if (normalized.startsWith("ws://") || normalized.startsWith("wss://")) {
    return `${normalized}/`;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return `${normalized.replace(/^http/, "ws")}/`;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${normalized}/`;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempt = 0;
    let activeSocket: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(createSocketUrl(WS_HOST));
      activeSocket = ws;
      setSocket(ws);

      ws.addEventListener("open", () => {
        reconnectAttempt = 0;
        setIsConnected(true);
      });

      ws.addEventListener("message", event => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === "room-state") setOnlineCount(message.users.length + 1);
          if (message.type === "user-joined") setOnlineCount(count => count + 1);
          if (message.type === "user-left") setOnlineCount(count => Math.max(1, count - 1));
        } catch {
          // Ignore malformed messages from the realtime endpoint.
        }
      });

      ws.addEventListener("close", () => {
        if (activeSocket === ws) {
          setIsConnected(false);
          setOnlineCount(0);
          setSocket(null);
        }
        if (!stopped) {
          const delay = Math.min(1_000 * 2 ** reconnectAttempt++, MAX_RECONNECT_DELAY);
          reconnectTimer = setTimeout(connect, delay);
        }
      });
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      activeSocket?.close(1000, "Page closed");
    };
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;
    const message: ClientMessage = { type: "identify", user };
    socket.send(JSON.stringify(message));
  }, [isConnected, socket, user]);

  const value = useMemo(
    () => ({ socket, isConnected, onlineCount }),
    [socket, isConnected, onlineCount],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextType {
  return useContext(SocketContext);
}
