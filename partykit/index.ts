/// <reference types="@cloudflare/workers-types" />

import { syncRecentItems } from "./sync-recent";
import type {
  ChatMessage,
  ClientMessage,
  Comment,
  RemoteUser,
  ServerMessage,
} from "../app/lib/types";

interface Env {
  DATABASE_URL?: string;
  GALLERY_ROOM: DurableObjectNamespace;
}

interface Connection {
  socket: WebSocket;
  user: RemoteUser | null;
}

interface AcceptedWebSocket extends WebSocket {
  accept(): void;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidIdentity(user: unknown): user is { id: string; name: string; color: string } {
  if (!user || typeof user !== "object") return false;
  const candidate = user as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 200 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    candidate.name.length <= 80 &&
    typeof candidate.color === "string" &&
    /^#[0-9a-f]{6}$/i.test(candidate.color)
  );
}

function isComment(comment: unknown): comment is Comment {
  if (!comment || typeof comment !== "object") return false;
  const candidate = comment as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.item_id === "string" &&
    typeof candidate.user_id === "string" &&
    typeof candidate.user_name === "string" &&
    candidate.user_name.length <= 80 &&
    typeof candidate.user_color === "string" &&
    /^#[0-9a-f]{6}$/i.test(candidate.user_color) &&
    typeof candidate.text === "string" &&
    candidate.text.length > 0 &&
    candidate.text.length <= 2_000 &&
    typeof candidate.created_at === "number" &&
    Number.isFinite(candidate.created_at)
  );
}

function isChatMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length <= 200 &&
    typeof candidate.user_id === "string" &&
    typeof candidate.user_name === "string" &&
    candidate.user_name.length > 0 &&
    candidate.user_name.length <= 80 &&
    typeof candidate.user_color === "string" &&
    /^#[0-9a-f]{6}$/i.test(candidate.user_color) &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length > 0 &&
    candidate.text.length <= 280 &&
    typeof candidate.created_at === "number" &&
    Number.isFinite(candidate.created_at)
  );
}

export class GalleryRoom {
  private readonly connections = new Map<string, Connection>();

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    void this.state;
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, online: this.onlineUsers().length });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      if (url.pathname === "/") {
        return json({
          ok: true,
          service: "cursor-community-realtime",
          websocket: "Connect to this URL using ws:// or wss://",
          health: "/health",
        });
      }
      return json({ error: "Not found" }, 404);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as AcceptedWebSocket;
    const connectionId = crypto.randomUUID();

    server.accept();
    this.connections.set(connectionId, { socket: server, user: null });
    this.send(server, { type: "room-state", users: this.onlineUsers() });

    server.addEventListener("message", event => {
      if (typeof event.data !== "string" || event.data.length > 10_000) return;
      try {
        this.handleMessage(connectionId, JSON.parse(event.data) as ClientMessage);
      } catch {
        // Ignore malformed client messages.
      }
    });
    server.addEventListener("close", () => this.disconnect(connectionId));
    server.addEventListener("error", () => this.disconnect(connectionId));

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(connectionId: string, message: ClientMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !message || typeof message !== "object") return;

    if (message.type === "identify" && isValidIdentity(message.user)) {
      const wasIdentified = connection.user !== null;
      connection.user = {
        ...message.user,
        x: connection.user?.x ?? 0,
        y: connection.user?.y ?? 0,
        lastSeen: Date.now(),
      };
      if (!wasIdentified) {
        this.broadcast({ type: "user-joined", user: connection.user }, connectionId);
      }
      return;
    }

    if (!connection.user) return;

    if (
      message.type === "cursor-move" &&
      Number.isFinite(message.x) &&
      Number.isFinite(message.y)
    ) {
      connection.user.x = message.x;
      connection.user.y = message.y;
      connection.user.lastSeen = Date.now();
      this.broadcast({
        type: "cursor-update",
        userId: connection.user.id,
        x: message.x,
        y: message.y,
      }, connectionId);
      return;
    }

    if (message.type === "comment-publish" && isComment(message.comment)) {
      if (message.comment.user_id !== connection.user.id) return;
      this.broadcast({ type: "comment-added", comment: message.comment }, connectionId);
      return;
    }

    if (
      message.type === "reply-publish" &&
      typeof message.commentId === "string" &&
      isComment(message.reply)
    ) {
      if (message.reply.user_id !== connection.user.id) return;
      this.broadcast({
        type: "reply-added",
        commentId: message.commentId,
        reply: message.reply,
      }, connectionId);
      return;
    }

    if (message.type === "chat-send" && isChatMessage(message.message)) {
      if (message.message.user_id !== connection.user.id) return;
      this.broadcast({ type: "chat-message", message: message.message }, connectionId);
    }
  }

  private onlineUsers(): RemoteUser[] {
    return Array.from(this.connections.values())
      .map(connection => connection.user)
      .filter((user): user is RemoteUser => user !== null);
  }

  private send(socket: WebSocket, message: ServerMessage) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The close/error event will remove stale sockets.
    }
  }

  private broadcast(message: ServerMessage, excludedConnectionId?: string) {
    for (const [connectionId, connection] of this.connections) {
      if (connectionId !== excludedConnectionId) this.send(connection.socket, message);
    }
  }

  private disconnect(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    this.connections.delete(connectionId);
    if (connection.user) {
      this.broadcast({ type: "user-left", userId: connection.user.id });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const roomId = env.GALLERY_ROOM.idFromName("gallery");
    return env.GALLERY_ROOM.get(roomId).fetch(request);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(syncRecentItems(env));
  },
} satisfies ExportedHandler<Env>;
