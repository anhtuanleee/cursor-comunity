"use client";

import { useEffect, useMemo } from "react";
import { useCursors } from "@/hooks/use-cursors";
import { LocalCursor } from "./local-cursor";
import { RemoteCursor } from "./remote-cursor";
import { QuickChatInput } from "./quick-chat-input";
import { useUser } from "@/providers/user-provider";
import { assignRemoteCursorColors } from "./cursor-remote-color";

const LOCAL_CURSOR_COLOR = "#111111";

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
  const remoteCursorColors = useMemo(
    () => assignRemoteCursorColors(
      Array.from(remoteCursors.keys()).filter(id => id !== user?.id),
      user?.color,
    ),
    [remoteCursors, user?.color, user?.id],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("custom-cursor-active", hasCustomCursor);
    return () => root.classList.remove("custom-cursor-active");
  }, [hasCustomCursor]);

  return (
    <div className="cursor-overlay fixed inset-0 z-[200] pointer-events-none">
      {Array.from(remoteCursors.values())
        .filter(c => c.id !== user?.id && c.lastSeen > 0)
        .map(cursor => {
          const color = remoteCursorColors.get(cursor.id) ?? cursor.color;
          return (
            <RemoteCursor
              key={cursor.id}
              color={color}
              x={cursor.x}
              y={cursor.y}
              message={chatMessages.get(cursor.id)?.text}
            />
          );
        })}
      {localPosition ? <LocalCursor position={localPosition} /> : null}
      {user && (
        <QuickChatInput
          color={LOCAL_CURSOR_COLOR}
          position={localPosition}
          onTextChange={updateCursorChat}
          onClear={clearCursorChat}
          onExit={exitCursorChat}
        />
      )}
    </div>
  );
}
