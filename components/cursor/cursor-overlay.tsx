"use client";

import { useEffect } from "react";
import { useCursors } from "@/hooks/use-cursors";
import { RemoteCursor } from "./remote-cursor";
import { QuickChatInput } from "./quick-chat-input";
import { useUser } from "@/providers/user-provider";

export function CursorOverlay() {
  const {
    remoteCursors,
    localPosition,
    chatMessages,
    updateCursorChat,
    clearCursorChat,
    exitCursorChat,
  } = useCursors();
  const { user } = useUser();
  const hasCustomCursor = Boolean(user);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("custom-cursor-active", hasCustomCursor);
    return () => root.classList.remove("custom-cursor-active");
  }, [hasCustomCursor]);

  return (
    <div className="cursor-overlay fixed inset-0 z-[200] pointer-events-none">
      {user && localPosition ? (
        <RemoteCursor
          color={user.color}
          x={localPosition.x}
          y={localPosition.y}
          message={chatMessages.get(user.id)?.text}
        />
      ) : null}
      {Array.from(remoteCursors.values())
        .filter(c => c.id !== user?.id && c.lastSeen > 0)
        .map(cursor => (
          <RemoteCursor
            key={cursor.id}
            color={cursor.color}
            x={cursor.x}
            y={cursor.y}
            message={chatMessages.get(cursor.id)?.text}
          />
        ))}
      {user && (
        <QuickChatInput
          color={user.color}
          position={localPosition}
          visible={Boolean(localPosition)}
          onTextChange={updateCursorChat}
          onClear={clearCursorChat}
          onExit={exitCursorChat}
        />
      )}
    </div>
  );
}
