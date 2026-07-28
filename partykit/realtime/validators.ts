import type {
  BoardMutation,
  ClientMessage,
  Comment,
  LiveReaction,
  ReactionKind,
} from "../../lib/types";
import { CURSOR_CHAT_MAX_LENGTH } from "./constants";

interface Identity {
  id: string;
  name: string;
  color: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isBoundedString(
  value: unknown,
  maxLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

export function isSequence(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function parseIdentity(value: unknown): Identity | null {
  const user = record(value);
  if (
    user &&
    isBoundedString(user.id, 200) &&
    isBoundedString(user.name, 80) &&
    isColor(user.color)
  ) {
    return { id: user.id, name: user.name, color: user.color };
  }
  return null;
}

function isComment(value: unknown): value is Comment {
  const comment = record(value);
  return Boolean(
    comment &&
      isBoundedString(comment.id, 200) &&
      isBoundedString(comment.item_id, 200) &&
      isBoundedString(comment.user_id, 200) &&
      isBoundedString(comment.user_name, 80) &&
      isColor(comment.user_color) &&
      isBoundedString(comment.text, 2_000) &&
      (comment.parent_id === null ||
        isBoundedString(comment.parent_id, 200)) &&
      (comment.position_x === null ||
        (typeof comment.position_x === "number" &&
          Number.isFinite(comment.position_x))) &&
      (comment.position_y === null ||
        (typeof comment.position_y === "number" &&
          Number.isFinite(comment.position_y))) &&
      typeof comment.resolved === "boolean" &&
      typeof comment.created_at === "number" &&
      Number.isFinite(comment.created_at),
  );
}

function isReactionKind(value: unknown): value is ReactionKind {
  return (
    value === "love" ||
    value === "useful" ||
    value === "question"
  );
}

function isLiveReaction(value: unknown): value is LiveReaction {
  const reaction = record(value);
  return Boolean(
    reaction &&
      isBoundedString(reaction.id, 200) &&
      isBoundedString(reaction.itemId, 200) &&
      isReactionKind(reaction.kind) &&
      isBoundedString(reaction.userId, 200) &&
      isBoundedString(reaction.userName, 80) &&
      isColor(reaction.userColor) &&
      (reaction.delta === 1 || reaction.delta === -1) &&
      typeof reaction.createdAt === "number" &&
      Number.isFinite(reaction.createdAt),
  );
}

function isBoardLane(value: unknown): value is BoardMutation["lane"] {
  return value === "keep" || value === "maybe" || value === "reject";
}

function isBoardMutation(value: unknown): value is BoardMutation {
  const mutation = record(value);
  return Boolean(
    mutation &&
      mutation.boardId === "community-shortlist" &&
      isBoundedString(mutation.itemId, 200) &&
      isBoardLane(mutation.lane) &&
      typeof mutation.reason === "string" &&
      mutation.reason.length <= 280 &&
      typeof mutation.position === "number" &&
      Number.isSafeInteger(mutation.position) &&
      mutation.position >= 0 &&
      isBoundedString(mutation.updatedBy, 200) &&
      isBoundedString(mutation.updatedByName, 80) &&
      isColor(mutation.updatedByColor) &&
      typeof mutation.updatedAt === "number" &&
      Number.isFinite(mutation.updatedAt),
  );
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  const message = record(value);
  if (!message || typeof message.type !== "string") return null;

  switch (message.type) {
    case "identify": {
      const user = parseIdentity(message.user);
      return user ? { type: "identify", user } : null;
    }
    case "cursor-move":
      return typeof message.x === "number" &&
        Number.isFinite(message.x) &&
        typeof message.y === "number" &&
        Number.isFinite(message.y)
        ? { type: "cursor-move", x: message.x, y: message.y }
        : null;
    case "cursor-chat-update":
      return isBoundedString(message.text, CURSOR_CHAT_MAX_LENGTH) &&
        message.text.trim().length > 0 &&
        isSequence(message.sequence)
        ? {
            type: "cursor-chat-update",
            text: message.text,
            sequence: message.sequence,
          }
        : null;
    case "cursor-chat-clear":
    case "cursor-chat-exit":
      return isSequence(message.sequence)
        ? { type: message.type, sequence: message.sequence }
        : null;
    case "comment-publish":
      return isComment(message.comment)
        ? { type: "comment-publish", comment: message.comment }
        : null;
    case "reply-publish":
      return isBoundedString(message.commentId, 200) &&
        isComment(message.reply)
        ? {
            type: "reply-publish",
            commentId: message.commentId,
            reply: message.reply,
          }
        : null;
    case "reaction-publish":
      return isLiveReaction(message.reaction)
        ? { type: "reaction-publish", reaction: message.reaction }
        : null;
    case "focus-set":
      return isBoundedString(message.itemId, 200)
        ? { type: "focus-set", itemId: message.itemId }
        : null;
    case "focus-clear":
      return { type: "focus-clear" };
    case "board-item-publish":
      return isBoardMutation(message.mutation)
        ? { type: "board-item-publish", mutation: message.mutation }
        : null;
    default:
      return null;
  }
}

export function isCursorChatUpdate(
  message: ClientMessage,
): message is Extract<ClientMessage, { type: "cursor-chat-update" }> {
  return message.type === "cursor-chat-update";
}

export function isCursorChatClear(
  message: ClientMessage,
): message is Extract<
  ClientMessage,
  { type: "cursor-chat-clear" | "cursor-chat-exit" }
> {
  return (
    message.type === "cursor-chat-clear" ||
    message.type === "cursor-chat-exit"
  );
}
