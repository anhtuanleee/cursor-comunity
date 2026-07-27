"use client";

import { useCursors } from "@/hooks/use-cursors";
import { RemoteCursor } from "./remote-cursor";
import { QuickChatInput } from "./quick-chat-input";
import { useUser } from "@/providers/user-provider";

export function CursorOverlay() {
  const { remoteCursors, localPosition, chatMessages, sendQuickChat } = useCursors();
  const { user } = useUser();

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {user && localPosition && (
        <RemoteCursor
          color={user.color}
          x={localPosition.x}
          y={localPosition.y}
          message={chatMessages.get(user.id)?.text}
        />
      )}
      {Array.from(remoteCursors.values())
        .filter(c => c.id !== user?.id)
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
          position={localPosition}
          color={user.color}
          onSend={sendQuickChat}
        />
      )}
    </div>
  );
}
