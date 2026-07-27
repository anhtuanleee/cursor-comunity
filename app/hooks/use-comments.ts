"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import type { ClientMessage, Comment, ServerMessage } from "@/lib/types";

interface CommentResponse {
  comment?: Comment;
  error?: string;
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
        setComments(data.comments || []);
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
          setComments(current =>
            current.some(comment => comment.id === message.comment.id)
              ? current
              : [message.comment, ...current],
          );
        }
        if (message.type === "reply-added" && message.reply.item_id === itemId) {
          setComments(current =>
            current.map(comment => {
              if (comment.id !== message.commentId) return comment;
              const replies = comment.replies || [];
              return replies.some(reply => reply.id === message.reply.id)
                ? comment
                : { ...comment, replies: [...replies, message.reply] };
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
    try {
      const comment = await persistComment({
        itemId,
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        text,
      });
      setComments(current => [comment, ...current]);
      if (socket?.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { type: "comment-publish", comment };
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save comment";
      setError(message);
      throw err;
    }
  }, [itemId, persistComment, socket, user]);

  const addReply = useCallback(async (commentId: string, text: string) => {
    if (!user || !itemId) throw new Error("User or item is unavailable");
    setError(null);
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
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      if (socket?.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { type: "reply-publish", commentId, reply };
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save reply";
      setError(message);
      throw err;
    }
  }, [itemId, persistComment, socket, user]);

  return { comments, loading, error, addComment, addReply };
}
