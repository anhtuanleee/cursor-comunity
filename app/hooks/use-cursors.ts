"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import type { ChatMessage, ClientMessage, RemoteUser, ServerMessage } from "@/lib/types";

const CHAT_BUBBLE_DURATION = 4_000;

export function useCursors() {
  const { socket } = useSocket();
  const { user } = useUser();
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteUser>>(new Map());
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<Map<string, ChatMessage>>(new Map());
  const chatTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showChatMessage = useCallback((message: ChatMessage) => {
    const currentTimer = chatTimersRef.current.get(message.user_id);
    if (currentTimer) clearTimeout(currentTimer);

    setChatMessages(current => {
      const next = new Map(current);
      next.set(message.user_id, message);
      return next;
    });

    const timer = setTimeout(() => {
      setChatMessages(current => {
        const next = new Map(current);
        next.delete(message.user_id);
        return next;
      });
      chatTimersRef.current.delete(message.user_id);
    }, CHAT_BUBBLE_DURATION);
    chatTimersRef.current.set(message.user_id, timer);
  }, []);

  useEffect(() => () => {
    for (const timer of chatTimersRef.current.values()) clearTimeout(timer);
    chatTimersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        switch (message.type) {
          case "room-state":
            setRemoteCursors(new Map(message.users.map(remote => [remote.id, remote])));
            break;
          case "user-joined":
            setRemoteCursors(current => {
              const next = new Map(current);
              next.set(message.user.id, message.user);
              return next;
            });
            break;
          case "user-left":
            setRemoteCursors(current => {
              const next = new Map(current);
              next.delete(message.userId);
              return next;
            });
            break;
          case "cursor-update":
            setRemoteCursors(current => {
              const existing = current.get(message.userId);
              if (!existing) return current;
              const next = new Map(current);
              next.set(message.userId, {
                ...existing,
                x: message.x,
                y: message.y,
                lastSeen: Date.now(),
              });
              return next;
            });
            break;
          case "chat-message":
            showChatMessage(message.message);
            break;
        }
      } catch {
        // Ignore unrelated or malformed realtime messages.
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [showChatMessage, socket]);

  useEffect(() => {
    if (!user) return;
    let animationFrame: number | null = null;
    let latestPosition: { x: number; y: number } | null = null;

    const flushPosition = () => {
      animationFrame = null;
      if (!latestPosition) return;
      setLocalPosition(latestPosition);
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const message: ClientMessage = {
        type: "cursor-move",
        x: latestPosition.x,
        y: latestPosition.y,
      };
      socket.send(JSON.stringify(message));
    };

    const handlePointerMove = (event: PointerEvent) => {
      latestPosition = {
        x: event.clientX,
        y: event.clientY,
      };
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(flushPosition);
      }
    };

    const hideLocalCursor = () => {
      latestPosition = null;
      setLocalPosition(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", hideLocalCursor);
    window.addEventListener("blur", hideLocalCursor);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("mouseleave", hideLocalCursor);
      window.removeEventListener("blur", hideLocalCursor);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [socket, user]);

  const sendQuickChat = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text || !user || socket?.readyState !== WebSocket.OPEN) return false;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      user_name: user.name,
      user_color: user.color,
      text: text.slice(0, 280),
      created_at: Date.now(),
    };
    const payload: ClientMessage = { type: "chat-send", message };
    socket.send(JSON.stringify(payload));
    showChatMessage(message);
    return true;
  }, [showChatMessage, socket, user]);

  return { remoteCursors, localPosition, chatMessages, sendQuickChat };
}
