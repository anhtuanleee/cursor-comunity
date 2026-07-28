"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import type {
  ClientMessage,
  CursorChat,
  RemoteUser,
  ServerMessage,
} from "@/lib/types";

const CHAT_VISIBLE_DURATION = 5_000;
const CHAT_SEND_INTERVAL = 80;
const CURSOR_SEND_INTERVAL = 50;

function sendSocketMessage(socket: WebSocket | null, message: ClientMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

export function useCursors() {
  const { socket, isConnected } = useSocket();
  const { user } = useUser();
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteUser>>(new Map());
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<Map<string, CursorChat>>(new Map());

  const chatTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localChatRef = useRef({ active: false, text: "", sequence: 0 });
  const chatSequenceRef = useRef(0);
  const pendingChatRef = useRef<string | null>(null);
  const chatFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChatSentAtRef = useRef(0);

  const clearRemoteChatTimer = useCallback((userId: string) => {
    const timer = chatTimersRef.current.get(userId);
    if (timer) clearTimeout(timer);
    chatTimersRef.current.delete(userId);
  }, []);

  const scheduleRemoteChat = useCallback((chat: CursorChat) => {
    if (chat.user_id === user?.id) return;
    clearRemoteChatTimer(chat.user_id);
    setChatMessages(current => {
      const previous = current.get(chat.user_id);
      if (previous && previous.sequence > chat.sequence) return current;
      const next = new Map(current);
      next.set(chat.user_id, chat);
      return next;
    });

    const delay = Math.max(
      100,
      chat.updated_at + CHAT_VISIBLE_DURATION - Date.now(),
    );
    const timer = setTimeout(() => {
      setChatMessages(current => {
        const currentChat = current.get(chat.user_id);
        if (!currentChat || currentChat.sequence !== chat.sequence) return current;
        const next = new Map(current);
        next.delete(chat.user_id);
        return next;
      });
      chatTimersRef.current.delete(chat.user_id);
    }, delay);
    chatTimersRef.current.set(chat.user_id, timer);
  }, [clearRemoteChatTimer, user?.id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        switch (message.type) {
          case "room-state": {
            setRemoteCursors(new Map(message.users.map(remote => [remote.id, remote])));
            for (const timer of chatTimersRef.current.values()) clearTimeout(timer);
            chatTimersRef.current.clear();
            setChatMessages(new Map());
            for (const chat of message.chats) scheduleRemoteChat(chat);
            break;
          }
          case "user-joined":
            setRemoteCursors(current => {
              const next = new Map(current);
              next.set(message.user.id, message.user);
              return next;
            });
            break;
          case "user-left":
            clearRemoteChatTimer(message.userId);
            setChatMessages(current => {
              if (!current.has(message.userId)) return current;
              const next = new Map(current);
              next.delete(message.userId);
              return next;
            });
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
          case "cursor-chat-updated":
            scheduleRemoteChat(message.chat);
            break;
          case "cursor-chat-cleared":
            clearRemoteChatTimer(message.userId);
            setChatMessages(current => {
              const existing = current.get(message.userId);
              if (!existing || existing.sequence > message.sequence) return current;
              const next = new Map(current);
              next.delete(message.userId);
              return next;
            });
            break;
          case "comment-added":
          case "reply-added":
            break;
        }
      } catch {
        // Ignore unrelated or malformed realtime messages.
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [clearRemoteChatTimer, scheduleRemoteChat, socket]);

  useEffect(() => () => {
    for (const timer of chatTimersRef.current.values()) clearTimeout(timer);
    chatTimersRef.current.clear();
    if (chatFlushTimerRef.current) clearTimeout(chatFlushTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isConnected || !socket || !user) return;
    const localChat = localChatRef.current;
    if (!localChat.active || !localChat.text.trim()) return;

    const resendTimer = setTimeout(() => {
      const sequence = ++chatSequenceRef.current;
      localChat.sequence = sequence;
      lastChatSentAtRef.current = performance.now();
      sendSocketMessage(socket, {
        type: "cursor-chat-update",
        text: localChat.text.slice(0, 280),
        sequence,
      });
    }, 80);
    return () => clearTimeout(resendTimer);
  }, [isConnected, socket, user]);

  useEffect(() => {
    let animationFrame: number | null = null;
    let cursorSendTimer: ReturnType<typeof setTimeout> | null = null;
    let latestPosition: { x: number; y: number } | null = null;
    let lastCursorSentAt = 0;

    const sendLatestPosition = () => {
      cursorSendTimer = null;
      if (!latestPosition || !socket || !user) return;
      lastCursorSentAt = performance.now();
      sendSocketMessage(socket, {
        type: "cursor-move",
        x: latestPosition.x,
        y: latestPosition.y,
      });
    };

    const scheduleCursorSend = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const elapsed = performance.now() - lastCursorSentAt;
      if (elapsed >= CURSOR_SEND_INTERVAL) {
        sendLatestPosition();
      } else if (cursorSendTimer === null) {
        cursorSendTimer = setTimeout(
          sendLatestPosition,
          CURSOR_SEND_INTERVAL - elapsed,
        );
      }
    };

    const flushPosition = () => {
      animationFrame = null;
      if (!latestPosition) return;
      setLocalPosition(latestPosition);
      scheduleCursorSend();
    };

    const handlePointerMove = (event: PointerEvent) => {
      latestPosition = { x: event.clientX, y: event.clientY };
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(flushPosition);
      }
    };

    const hideLocalCursor = () => {
      latestPosition = null;
      setLocalPosition(null);
    };

    const handlePointerOut = (event: PointerEvent) => {
      // `pointerout` bubbles from any element; a null related target means the
      // pointer has actually left the browser viewport rather than moved within it.
      if (event.relatedTarget === null) hideLocalCursor();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("blur", hideLocalCursor);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", hideLocalCursor);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (cursorSendTimer !== null) clearTimeout(cursorSendTimer);
    };
  }, [socket, user]);

  const flushChat = useCallback(() => {
    chatFlushTimerRef.current = null;
    const pendingText = pendingChatRef.current;
    if (pendingText === null || !user) return;
    pendingChatRef.current = null;

    const sequence = ++chatSequenceRef.current;
    localChatRef.current.sequence = sequence;
    lastChatSentAtRef.current = performance.now();
    if (pendingText.trim()) {
      sendSocketMessage(socket, {
        type: "cursor-chat-update",
        text: pendingText.slice(0, 280),
        sequence,
      });
    } else {
      sendSocketMessage(socket, { type: "cursor-chat-clear", sequence });
    }
  }, [socket, user]);

  const updateCursorChat = useCallback((rawText: string) => {
    const text = rawText.slice(0, 280);
    localChatRef.current = { ...localChatRef.current, active: true, text };
    pendingChatRef.current = text;
    if (chatFlushTimerRef.current) clearTimeout(chatFlushTimerRef.current);

    const elapsed = performance.now() - lastChatSentAtRef.current;
    if (elapsed >= CHAT_SEND_INTERVAL) {
      flushChat();
    } else {
      chatFlushTimerRef.current = setTimeout(
        flushChat,
        CHAT_SEND_INTERVAL - elapsed,
      );
    }
  }, [flushChat]);

  const clearCursorChat = useCallback(() => {
    localChatRef.current = { ...localChatRef.current, active: true, text: "" };
    pendingChatRef.current = null;
    if (chatFlushTimerRef.current) clearTimeout(chatFlushTimerRef.current);
    const sequence = ++chatSequenceRef.current;
    localChatRef.current.sequence = sequence;
    sendSocketMessage(socket, { type: "cursor-chat-clear", sequence });
  }, [socket]);

  const exitCursorChat = useCallback(() => {
    localChatRef.current = { ...localChatRef.current, active: false, text: "" };
    pendingChatRef.current = null;
    if (chatFlushTimerRef.current) clearTimeout(chatFlushTimerRef.current);
    const sequence = ++chatSequenceRef.current;
    localChatRef.current.sequence = sequence;
    sendSocketMessage(socket, { type: "cursor-chat-exit", sequence });
  }, [socket]);

  return {
    remoteCursors,
    localPosition,
    chatMessages,
    updateCursorChat,
    clearCursorChat,
    exitCursorChat,
  };
}
