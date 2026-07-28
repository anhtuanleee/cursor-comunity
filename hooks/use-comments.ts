"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import type { ClientMessage, Comment, ServerMessage } from "@/lib/types";

interface CommentResponse {
  comment?: Comment;
  error?: string;
}

function isOptimistic(comment: Comment) {
  return comment.id.startsWith("optimistic:");
}

function sameAuthorAndText(first: Comment, second: Comment) {
  return (
    first.user_id === second.user_id &&
    first.text === second.text &&
    first.parent_id === second.parent_id
  );
}

export function useComments(itemId?: string) {
  const { socket } = useSocket();
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setComments([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch(`/api/comments?itemId=${encodeURIComponent(itemId)}`, {
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Unable to load comments (${res.status})`);
        const data = await res.json() as { comments?: Comment[] };
        const loaded = data.comments || [];
        setComments(current => {
          const optimisticTopLevel = current.filter(isOptimistic);
          const merged = loaded.map(comment => {
            const currentComment = current.find(entry => entry.id === comment.id);
            const optimisticReplies = (currentComment?.replies || []).filter(isOptimistic);
            return { ...comment, replies: [...(comment.replies || []), ...optimisticReplies] };
          });
          const unresolvedOptimistic = optimisticTopLevel.filter(optimistic =>
            !loaded.some(comment => sameAuthorAndText(comment, optimistic)),
          );
          return [...merged, ...unresolvedOptimistic];
        });
      })
      .catch(err => {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Unable to load comments");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [itemId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "comment-added" && message.comment.item_id === itemId) {
          setComments(current => {
            if (current.some(comment => comment.id === message.comment.id)) return current;
            const optimisticIndex = current.findIndex(comment =>
              isOptimistic(comment) && sameAuthorAndText(comment, message.comment),
            );
            if (optimisticIndex === -1) return [message.comment, ...current];
            return current.map((comment, index) =>
              index === optimisticIndex ? message.comment : comment,
            );
          });
        }
        if (message.type === "reply-added" && message.reply.item_id === itemId) {
          setComments(current =>
            current.map(comment => {
              if (comment.id !== message.commentId) return comment;
              const replies = comment.replies || [];
              if (replies.some(reply => reply.id === message.reply.id)) return comment;
              const optimisticIndex = replies.findIndex(reply =>
                isOptimistic(reply) && sameAuthorAndText(reply, message.reply),
              );
              return {
                ...comment,
                replies:
                  optimisticIndex === -1
                    ? [...replies, message.reply]
                    : replies.map((reply, index) =>
                        index === optimisticIndex ? message.reply : reply,
                      ),
              };
            }),
          );
        }
      } catch {
        // Ignore unrelated or malformed realtime messages.
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [socket, itemId]);

  const persistComment = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as CommentResponse;
    if (!res.ok || !data.comment) {
      throw new Error(data.error || "Unable to save comment");
    }
    return data.comment;
  }, []);

  const addComment = useCallback(async (text: string) => {
    if (!user || !itemId) throw new Error("User or item is unavailable");
    setError(null);
    const optimisticComment: Comment = {
      id: `optimistic:${crypto.randomUUID()}`,
      item_id: itemId,
      user_id: user.id,
      user_name: user.name,
      user_color: user.color,
      text,
      parent_id: null,
      position_x: null,
      position_y: null,
      resolved: false,
      replies: [],
      created_at: Date.now(),
    };
    setComments(current => [optimisticComment, ...current]);
    try {
      const comment = await persistComment({
        itemId,
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        text,
      });
      setComments(current =>
        current.map(entry =>
          entry.id === optimisticComment.id ? comment : entry,
        ),
      );
      if (socket?.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { type: "comment-publish", comment };
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      setComments(current =>
        current.filter(entry => entry.id !== optimisticComment.id),
      );
      const message = err instanceof Error ? err.message : "Unable to save comment";
      setError(message);
      throw err;
    }
  }, [itemId, persistComment, socket, user]);

  const addReply = useCallback(async (commentId: string, text: string) => {
    if (!user || !itemId) throw new Error("User or item is unavailable");
    setError(null);
    const optimisticReply: Comment = {
      id: `optimistic:${crypto.randomUUID()}`,
      item_id: itemId,
      user_id: user.id,
      user_name: user.name,
      user_color: user.color,
      text,
      parent_id: commentId,
      position_x: null,
      position_y: null,
      resolved: false,
      replies: [],
      created_at: Date.now(),
    };
    setComments(current => current.map(comment =>
      comment.id === commentId
        ? { ...comment, replies: [...(comment.replies || []), optimisticReply] }
        : comment,
    ));
    try {
      const reply = await persistComment({
        itemId,
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        text,
        parentId: commentId,
      });
      setComments(current => current.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              replies: (comment.replies || []).map(entry =>
                entry.id === optimisticReply.id ? reply : entry,
              ),
            }
          : comment,
      ));
      if (socket?.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { type: "reply-publish", commentId, reply };
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      setComments(current => current.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              replies: (comment.replies || []).filter(entry =>
                entry.id !== optimisticReply.id,
              ),
            }
          : comment,
      ));
      const message = err instanceof Error ? err.message : "Unable to save reply";
      setError(message);
      throw err;
    }
  }, [itemId, persistComment, socket, user]);

  return { comments, loading, error, addComment, addReply };
}
