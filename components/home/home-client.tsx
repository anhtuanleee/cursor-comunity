"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/header/header";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { CursorOverlay } from "@/components/cursor/cursor-overlay";
import { CommentLayer } from "@/components/comment/comment-layer";
import { ShortlistBoard } from "@/components/board/shortlist-board";
import { Walkthrough } from "@/components/onboarding/walkthrough";
import type {
  BoardLane,
  BoardEntry,
  GalleryItem,
  GalleryPage,
  ReactionKind,
} from "@/lib/types";
import { useSocket } from "@/providers/socket-provider";
import { useUser } from "@/providers/user-provider";
import { useCollaboration } from "@/hooks/use-collaboration";

export function HomeClient({ initialPage }: { initialPage: GalleryPage }) {
  const { onlineCount } = useSocket();
  const { user } = useUser();
  const {
    focus,
    reactionCounts,
    liveReactions,
    latestBoardMutation,
    react,
    focusItem,
    clearFocus,
    saveToBoard,
  } = useCollaboration();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [commentItem, setCommentItem] = useState<GalleryItem | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [optimisticBoardEntries, setOptimisticBoardEntries] = useState<BoardEntry[]>([]);
  const ownFocusRef = useRef<typeof focus>(null);
  const [replacedFocusVersion, setReplacedFocusVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!focus) {
      ownFocusRef.current = null;
      setReplacedFocusVersion(null);
      return;
    }
    if (focus.presenterId === user?.id) {
      ownFocusRef.current = focus;
      setReplacedFocusVersion(null);
      return;
    }
    if (ownFocusRef.current && focus.version > ownFocusRef.current.version) {
      setReplacedFocusVersion(focus.version);
    }
  }, [focus, user?.id]);

  const replacesYourFocus = replacedFocusVersion === focus?.version;

  const handleCommentClick = useCallback((item: GalleryItem) => {
    setCommentItem(item);
  }, []);

  const handleReaction = useCallback(
    (item: GalleryItem, kind: ReactionKind) => {
      void react(item.id, kind).catch(() => {
        // The persisted count is reloaded on the next visit if the API is down.
      });
    },
    [react],
  );

  const handleFocus = useCallback(
    (item: GalleryItem) => {
      if (
        focus?.itemId === item.id &&
        focus.presenterId === user?.id
      ) {
        clearFocus();
      } else {
        focusItem(item.id);
      }
    },
    [clearFocus, focus, focusItem, user?.id],
  );

  const handleSave = useCallback(
    (item: GalleryItem) => {
      const now = Date.now();
      const optimisticEntry: BoardEntry = {
        boardId: "community-shortlist",
        itemId: item.id,
        lane: "maybe",
        reason: "",
        position: 0,
        updatedBy: user?.id ?? "local-user",
        updatedByName: user?.name ?? "You",
        updatedByColor: user?.color ?? "#5A5A5A",
        updatedAt: now,
        title: item.title,
        coverUrl: item.cover_url || item.gallery?.[0]?.url || "",
        sourceUrl: item.source_url,
      };
      setOptimisticBoardEntries(current => [
        optimisticEntry,
        ...current.filter(entry => entry.itemId !== item.id),
      ]);
      setBoardOpen(true);
      void saveToBoard(item.id, "maybe")
        .then(mutation => {
          if (!mutation) return;
          setOptimisticBoardEntries(current => current.map(entry =>
            entry.itemId === item.id ? { ...entry, ...mutation } : entry,
          ));
        })
        .catch(() => {
          setOptimisticBoardEntries(current =>
            current.filter(entry => entry.itemId !== item.id),
          );
        });
    },
    [saveToBoard, user],
  );

  const handleBoardMove = useCallback(
    (itemId: string, lane: BoardLane, reason: string) =>
      saveToBoard(itemId, lane, reason),
    [saveToBoard],
  );

  const openBoard = useCallback(() => setBoardOpen(true), []);
  const closeBoard = useCallback(() => setBoardOpen(false), []);
  const closeComments = useCallback(() => setCommentItem(null), []);

  return (
    <>
      <Header
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onlineCount={onlineCount}
        onBoardOpen={openBoard}
      />
      <main>
        <GalleryGrid
          category={activeCategory}
          initialPage={initialPage}
          onCommentClick={handleCommentClick}
          onReact={handleReaction}
          onFocus={handleFocus}
          onSave={handleSave}
          focus={focus}
          currentUserId={user?.id}
          replacesYourFocus={replacesYourFocus}
          onClearFocus={clearFocus}
          reactionCounts={reactionCounts}
          liveReactions={liveReactions}
        />
      </main>
      <ShortlistBoard
        open={boardOpen}
        latestMutation={latestBoardMutation}
        optimisticEntries={optimisticBoardEntries}
        onClose={closeBoard}
        onMove={handleBoardMove}
      />
      <CursorOverlay />
      <CommentLayer activeItem={commentItem} onClose={closeComments} />
      <Walkthrough />
    </>
  );
}
