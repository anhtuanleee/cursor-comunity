"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import type {
  BoardLane,
  BoardMutation,
  ClientMessage,
  FocusState,
  LiveReaction,
  ReactionCounts,
  ReactionKind,
  ServerMessage,
} from "@/lib/types";

const EMPTY_COUNTS: ReactionCounts = { love: 0, useful: 0, question: 0 };
const REACTION_VISIBLE_MS = 1_800;

function send(socket: WebSocket | null, message: ClientMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

export function useCollaboration() {
  const { socket } = useSocket();
  const { user } = useUser();
  const [focus, setFocusState] = useState<FocusState | null>(null);
  const [reactionCounts, setReactionCounts] = useState<
    Record<string, ReactionCounts>
  >({});
  const [activeReactions, setActiveReactions] = useState<Set<string>>(
    new Set(),
  );
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([]);
  const [latestBoardMutation, setLatestBoardMutation] =
    useState<BoardMutation | null>(null);
  const reactionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const visibleReactionIdsRef = useRef<Set<string>>(new Set());

  const reactionKey = (itemId: string, kind: ReactionKind) => `${itemId}:${kind}`;

  const showReaction = useCallback((reaction: LiveReaction) => {
    if (visibleReactionIdsRef.current.has(reaction.id)) return;
    visibleReactionIdsRef.current.add(reaction.id);
    setReactionCounts(current => {
      const previous = current[reaction.itemId] ?? EMPTY_COUNTS;
      return {
        ...current,
        [reaction.itemId]: {
          ...previous,
          [reaction.kind]: Math.max(0, previous[reaction.kind] + reaction.delta),
        },
      };
    });
    setLiveReactions(current => [...current, reaction]);
    const timer = setTimeout(() => {
      setLiveReactions(current =>
        current.filter(item => item.id !== reaction.id),
      );
      reactionTimersRef.current.delete(reaction.id);
      visibleReactionIdsRef.current.delete(reaction.id);
    }, REACTION_VISIBLE_MS);
    reactionTimersRef.current.set(reaction.id, timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const query = user ? `?userId=${encodeURIComponent(user.id)}` : "";
        const response = await fetch(`/api/reactions${query}`);
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (
          cancelled ||
          !payload ||
          typeof payload !== "object" ||
          !Array.isArray((payload as { counts?: unknown }).counts)
        ) {
          return;
        }
        const next: Record<string, ReactionCounts> = {};
        for (const row of (payload as {
          counts: Array<{ itemId?: unknown; kind?: unknown; count?: unknown }>;
        }).counts) {
          if (
            typeof row.itemId !== "string" ||
            (row.kind !== "love" &&
              row.kind !== "useful" &&
              row.kind !== "question") ||
            typeof row.count !== "number"
          ) {
            continue;
          }
          next[row.itemId] = {
            ...(next[row.itemId] ?? EMPTY_COUNTS),
            [row.kind]: row.count,
          };
        }
        setReactionCounts(next);
        const active = (payload as { active?: unknown }).active;
        if (Array.isArray(active)) {
          const nextActive = new Set<string>();
          for (const entry of active) {
            if (
              entry &&
              typeof entry === "object" &&
              typeof (entry as { itemId?: unknown }).itemId === "string" &&
              ((entry as { kind?: unknown }).kind === "love" ||
                (entry as { kind?: unknown }).kind === "useful" ||
                (entry as { kind?: unknown }).kind === "question")
            ) {
              nextActive.add(reactionKey(
                (entry as { itemId: string }).itemId,
                (entry as { kind: ReactionKind }).kind,
              ));
            }
          }
          setActiveReactions(nextActive);
        }
      } catch {
        // Realtime remains usable if durable counts are temporarily unavailable.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "room-state") {
          setFocusState(message.focus);
        } else if (message.type === "focus-updated") {
          setFocusState(current =>
            !current || message.focus.version >= current.version
              ? message.focus
              : current,
          );
        } else if (message.type === "focus-cleared") {
          setFocusState(current =>
            current && current.version > message.version ? current : null,
          );
        } else if (message.type === "reaction-added") {
          showReaction(message.reaction);
        } else if (message.type === "board-item-updated") {
          setLatestBoardMutation(message.mutation);
        }
      } catch {
        // Ignore malformed or unrelated messages.
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [showReaction, socket]);

  useEffect(
    () => () => {
      for (const timer of reactionTimersRef.current.values()) {
        clearTimeout(timer);
      }
      reactionTimersRef.current.clear();
      visibleReactionIdsRef.current.clear();
    },
    [],
  );

  const react = useCallback(
    async (itemId: string, kind: ReactionKind) => {
      if (!user) return;
      const key = reactionKey(itemId, kind);
      const wasActive = activeReactions.has(key);
      const optimisticDelta: 1 | -1 = wasActive ? -1 : 1;
      const reaction: LiveReaction = {
        id: crypto.randomUUID(),
        itemId,
        kind,
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        delta: optimisticDelta,
        createdAt: Date.now(),
      };
      showReaction(reaction);
      setActiveReactions(current => {
        const next = new Set(current);
        if (wasActive) next.delete(key);
        else next.add(key);
        return next;
      });
      try {
        const response = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            kind,
            userId: user.id,
            userName: user.name,
            userColor: user.color,
          }),
        });
        if (!response.ok) throw new Error("Unable to save reaction");
        const result = (await response.json()) as {
          active: boolean;
          delta: 1 | -1;
          total: number;
        };
        setActiveReactions(current => {
          const next = new Set(current);
          if (result.active) next.add(key);
          else next.delete(key);
          return next;
        });
        setReactionCounts(current => ({
          ...current,
          [itemId]: {
            ...(current[itemId] ?? EMPTY_COUNTS),
            [kind]: result.total,
          },
        }));
        send(socket, {
          type: "reaction-publish",
          reaction: { ...reaction, delta: result.delta },
        });
      } catch (error) {
        setActiveReactions(current => {
          const next = new Set(current);
          if (wasActive) next.add(key);
          else next.delete(key);
          return next;
        });
        showReaction({
          ...reaction,
          id: crypto.randomUUID(),
          delta: optimisticDelta === 1 ? -1 : 1,
          createdAt: Date.now(),
        });
        throw error;
      }
    },
    [activeReactions, showReaction, socket, user],
  );

  const focusItem = useCallback(
    (itemId: string) => {
      if (!user || !send(socket, { type: "focus-set", itemId })) return;
      setFocusState(current => ({
        itemId,
        presenterId: user.id,
        presenterName: user.name,
        presenterColor: user.color,
        version: (current?.version ?? 0) + 1,
        updatedAt: Date.now(),
      }));
    },
    [socket, user],
  );

  const clearFocus = useCallback(() => {
    if (send(socket, { type: "focus-clear" })) setFocusState(null);
  }, [socket]);

  const saveToBoard = useCallback(
    async (
      itemId: string,
      lane: BoardLane = "maybe",
      reason = "",
      position = 0,
    ) => {
      if (!user) return null;
      const response = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          lane,
          reason,
          position,
          updatedBy: user.id,
          updatedByName: user.name,
          updatedByColor: user.color,
        }),
      });
      if (!response.ok) throw new Error("Unable to update shortlist");
      const payload = (await response.json()) as { mutation: BoardMutation };
      setLatestBoardMutation(payload.mutation);
      send(socket, {
        type: "board-item-publish",
        mutation: payload.mutation,
      });
      return payload.mutation;
    },
    [socket, user],
  );

  return {
    focus,
    reactionCounts,
    liveReactions,
    latestBoardMutation,
    react,
    focusItem,
    clearFocus,
    saveToBoard,
  };
}
