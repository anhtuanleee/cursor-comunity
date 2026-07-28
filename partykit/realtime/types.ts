import type { CursorChat, RemoteUser } from "../../lib/types";

export interface SocketAttachment {
  connectionId: string;
  user: RemoteUser | null;
  chat: CursorChat | null;
  lastChatSequence: number;
  chatWindowStartedAt: number;
  chatWindowCount: number;
}
