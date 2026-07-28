import { DurableObject } from "cloudflare:workers";
import type {
  BoardMutation,
  ClientMessage,
  CursorChat,
  FocusState,
  LiveReaction,
  RemoteUser,
  ServerMessage,
} from "../../lib/types";
import { jsonResponse } from "../shared/json-response";
import { logWorkerError } from "../shared/logger";
import {
  CURSOR_CHAT_TTL,
  FOCUS_STORAGE_KEY,
  FOCUS_TTL,
  MAX_SOCKET_MESSAGE_BYTES,
} from "./constants";
import {
  allowChatUpdate,
  createSocketAttachment,
  getSocketAttachment,
  saveSocketAttachment,
} from "./socket-attachment";
import {
  isCursorChatClear,
  isCursorChatUpdate,
  parseClientMessage,
} from "./validators";

export class GalleryRoom extends DurableObject<Env> {
  private readonly disconnected = new WeakSet<WebSocket>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, online: this.onlineUsers().length });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return url.pathname === "/"
        ? jsonResponse({
            ok: true,
            service: "cursor-community-realtime",
            websocket: "Connect to this URL using ws:// or wss://",
            health: "/health",
          })
        : jsonResponse({ error: "Not found" }, 404);
    }

    return this.openWebSocket();
  }

  async webSocketMessage(
    socket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ) {
    if (
      typeof rawMessage !== "string" ||
      rawMessage.length > MAX_SOCKET_MESSAGE_BYTES
    ) {
      return;
    }

    try {
      const message = parseClientMessage(JSON.parse(rawMessage));
      if (message) await this.handleMessage(socket, message);
    } catch (error) {
      logWorkerError("realtime_message_failed", error);
    }
  }

  async webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
  ) {
    this.disconnect(socket);
    try {
      socket.close(code, reason);
    } catch {
      // The runtime can already have completed the close handshake.
    }
  }

  async webSocketError(socket: WebSocket, error: unknown) {
    this.disconnect(socket);
    logWorkerError("realtime_socket_error", error);
  }

  private async openWebSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const attachment = createSocketAttachment();

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.send(server, {
      type: "room-state",
      users: this.onlineUsers(),
      chats: this.activeChats(),
      focus: await this.activeFocus(),
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(
    socket: WebSocket,
    message: ClientMessage,
  ): Promise<void> {
    const attachment = getSocketAttachment(socket);

    if (message.type === "identify") {
      const wasIdentified = attachment.user !== null;
      attachment.user = {
        ...message.user,
        x: attachment.user?.x ?? 0,
        y: attachment.user?.y ?? 0,
        lastSeen: attachment.user?.lastSeen ?? 0,
      };
      saveSocketAttachment(socket, attachment);
      if (!wasIdentified) {
        this.broadcast(
          { type: "user-joined", user: attachment.user },
          socket,
        );
      }
      return;
    }

    if (!attachment.user) return;

    if (message.type === "cursor-move") {
      attachment.user.x = message.x;
      attachment.user.y = message.y;
      attachment.user.lastSeen = Date.now();
      saveSocketAttachment(socket, attachment);
      this.broadcast(
        {
          type: "cursor-update",
          userId: attachment.user.id,
          x: message.x,
          y: message.y,
        },
        socket,
      );
      return;
    }

    if (message.type === "focus-set") {
      await this.setFocus(message.itemId, attachment.user);
      return;
    }

    if (message.type === "focus-clear") {
      await this.clearFocus(attachment.user.id);
      return;
    }

    if (message.type === "reaction-publish") {
      this.publishReaction(message.reaction, attachment.user, socket);
      return;
    }

    if (message.type === "board-item-publish") {
      this.publishBoardMutation(message.mutation, attachment.user, socket);
      return;
    }

    if (isCursorChatUpdate(message)) {
      if (
        !allowChatUpdate(attachment) ||
        message.sequence <= attachment.lastChatSequence
      ) {
        return;
      }
      attachment.lastChatSequence = message.sequence;
      attachment.chat = {
        user_id: attachment.user.id,
        user_name: attachment.user.name,
        user_color: attachment.user.color,
        text: message.text,
        sequence: message.sequence,
        updated_at: Date.now(),
      };
      saveSocketAttachment(socket, attachment);
      this.broadcast(
        { type: "cursor-chat-updated", chat: attachment.chat },
        socket,
      );
      return;
    }

    if (isCursorChatClear(message)) {
      if (message.sequence <= attachment.lastChatSequence) return;
      attachment.lastChatSequence = message.sequence;
      attachment.chat = null;
      saveSocketAttachment(socket, attachment);
      this.broadcast(
        {
          type: "cursor-chat-cleared",
          userId: attachment.user.id,
          sequence: message.sequence,
        },
        socket,
      );
      return;
    }

    if (message.type === "comment-publish") {
      if (message.comment.user_id !== attachment.user.id) return;
      this.broadcast(
        { type: "comment-added", comment: message.comment },
        socket,
      );
      return;
    }

    if (message.type === "reply-publish") {
      if (message.reply.user_id !== attachment.user.id) return;
      this.broadcast(
        {
          type: "reply-added",
          commentId: message.commentId,
          reply: message.reply,
        },
        socket,
      );
    }
  }

  private async setFocus(itemId: string, user: RemoteUser) {
    const previous = await this.activeFocus();
    const now = Date.now();
    const focus: FocusState = {
      itemId,
      presenterId: user.id,
      presenterName: user.name,
      presenterColor: user.color,
      version: Math.max(now, (previous?.version ?? 0) + 1),
      updatedAt: now,
    };
    await this.ctx.storage.put(FOCUS_STORAGE_KEY, focus);
    this.broadcast({ type: "focus-updated", focus });
  }

  private async clearFocus(userId: string) {
    const previous = await this.activeFocus();
    if (!previous || previous.presenterId !== userId) return;
    const version = Math.max(Date.now(), previous.version + 1);
    await this.ctx.storage.delete(FOCUS_STORAGE_KEY);
    this.broadcast({ type: "focus-cleared", version });
  }

  private publishReaction(
    input: LiveReaction,
    user: RemoteUser,
    excludedSocket: WebSocket,
  ) {
    const reaction: LiveReaction = {
      ...input,
      userId: user.id,
      userName: user.name,
      userColor: user.color,
      createdAt: Date.now(),
    };
    this.broadcast({ type: "reaction-added", reaction }, excludedSocket);
  }

  private publishBoardMutation(
    input: BoardMutation,
    user: RemoteUser,
    excludedSocket: WebSocket,
  ) {
    const mutation: BoardMutation = {
      ...input,
      updatedBy: user.id,
      updatedByName: user.name,
      updatedByColor: user.color,
    };
    this.broadcast(
      { type: "board-item-updated", mutation },
      excludedSocket,
    );
  }

  private onlineUsers(): RemoteUser[] {
    return this.ctx
      .getWebSockets()
      .map(socket => getSocketAttachment(socket).user)
      .filter((user): user is RemoteUser => user !== null);
  }

  private activeChats(): CursorChat[] {
    const now = Date.now();
    const chats: CursorChat[] = [];
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = getSocketAttachment(socket);
      if (!attachment.chat) continue;
      if (now - attachment.chat.updated_at > CURSOR_CHAT_TTL) {
        attachment.chat = null;
        saveSocketAttachment(socket, attachment);
        continue;
      }
      chats.push(attachment.chat);
    }
    return chats;
  }

  private async activeFocus(): Promise<FocusState | null> {
    const focus = await this.ctx.storage.get<FocusState>(FOCUS_STORAGE_KEY);
    if (!focus) return null;
    if (Date.now() - focus.updatedAt <= FOCUS_TTL) return focus;
    await this.ctx.storage.delete(FOCUS_STORAGE_KEY);
    return null;
  }

  private send(socket: WebSocket, message: ServerMessage) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      logWorkerError("realtime_send_failed", error);
    }
  }

  private broadcast(
    message: ServerMessage,
    excludedSocket?: WebSocket,
  ) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== excludedSocket) this.send(socket, message);
    }
  }

  private disconnect(socket: WebSocket) {
    if (this.disconnected.has(socket)) return;
    this.disconnected.add(socket);
    const user = getSocketAttachment(socket).user;
    if (user) {
      this.broadcast({ type: "user-left", userId: user.id }, socket);
      // Do not leave a presenter banner behind after a refresh, tab close, or
      // network drop. A focus belongs to the live socket that created it.
      void this.clearFocus(user.id);
    }
  }
}
