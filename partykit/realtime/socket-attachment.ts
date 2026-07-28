import {
  CURSOR_CHAT_UPDATES_PER_SECOND,
} from "./constants";
import type { SocketAttachment } from "./types";
import { isSequence } from "./validators";

export function createSocketAttachment(): SocketAttachment {
  return {
    connectionId: crypto.randomUUID(),
    user: null,
    chat: null,
    lastChatSequence: 0,
    chatWindowStartedAt: 0,
    chatWindowCount: 0,
  };
}

export function getSocketAttachment(socket: WebSocket): SocketAttachment {
  const attachment =
    socket.deserializeAttachment() as Partial<SocketAttachment> | null;
  return {
    connectionId: attachment?.connectionId || crypto.randomUUID(),
    user: attachment?.user ?? null,
    chat: attachment?.chat ?? null,
    lastChatSequence: isSequence(attachment?.lastChatSequence)
      ? attachment.lastChatSequence
      : 0,
    chatWindowStartedAt: Number(attachment?.chatWindowStartedAt || 0),
    chatWindowCount: Number(attachment?.chatWindowCount || 0),
  };
}

export function saveSocketAttachment(
  socket: WebSocket,
  attachment: SocketAttachment,
) {
  try {
    socket.serializeAttachment(attachment);
  } catch {
    // The socket can close between an event and attachment persistence.
  }
}

export function allowChatUpdate(attachment: SocketAttachment) {
  const now = Date.now();
  if (now - attachment.chatWindowStartedAt >= 1_000) {
    attachment.chatWindowStartedAt = now;
    attachment.chatWindowCount = 0;
  }
  if (attachment.chatWindowCount >= CURSOR_CHAT_UPDATES_PER_SECOND) {
    return false;
  }
  attachment.chatWindowCount += 1;
  return true;
}
