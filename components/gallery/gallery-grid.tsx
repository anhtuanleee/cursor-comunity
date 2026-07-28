"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useItems } from "@/hooks/use-items";
import { GalleryCard } from "./gallery-card";
import { Button } from "@/components/ui/button";
import { FocusBanner } from "@/components/collaboration/focus-banner";
import type {
  FocusState,
  GalleryItem,
  GalleryPage,
  LiveReaction,
  ReactionCounts,
  ReactionKind,
} from "@/lib/types";

interface GalleryGridProps {
  category: string | null;
  initialPage: GalleryPage;
  onCommentClick: (item: GalleryItem) => void;
  onReact?: (item: GalleryItem, kind: ReactionKind) => void;
  onFocus?: (item: GalleryItem) => void;
  onSave?: (item: GalleryItem) => void;
  focus?: FocusState | null;
  currentUserId?: string;
  replacesYourFocus?: boolean;
  onClearFocus?: () => void;
  reactionCounts?: Record<string, ReactionCounts>;
  liveReactions?: LiveReaction[];
}

function isFeaturedCard(index: number) {
  const position = index % 12;
  return position === 0 || position === 7;
}

export function GalleryGrid({
  category,
  initialPage,
  onCommentClick,
  onReact,
  onFocus,
  onSave,
  focus,
  currentUserId,
  replacesYourFocus = false,
  onClearFocus,
  reactionCounts = {},
  liveReactions = [],
}: GalleryGridProps) {
  const {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    loadUntil,
  } = useItems(category, initialPage);
  const reactionsByItem = useMemo(() => {
    const grouped = new Map<string, LiveReaction[]>();
    for (const reaction of liveReactions) {
      const reactions = grouped.get(reaction.itemId);
      if (reactions) reactions.push(reaction);
      else grouped.set(reaction.itemId, [reaction]);
    }
    return grouped;
  }, [liveReactions]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [declinedFocusVersion, setDeclinedFocusVersion] = useState<
    number | null
  >(null);
  const visibleFocus =
    focus && focus.version !== declinedFocusVersion ? focus : null;

  const joinFocus = async () => {
    const itemId = focus?.itemId;
    if (!itemId) return;

    const loaded = await loadUntil(itemId);
    if (!loaded) return;

    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-item-id]"),
    ).find(node => node.dataset.itemId === itemId);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.animate(
      [
        { outline: "0 solid transparent", outlineOffset: "0" },
        { outline: "0.1875rem solid #000", outlineOffset: "0.25rem" },
        { outline: "0 solid transparent", outlineOffset: "0" },
      ],
      { duration: 900, easing: "ease-out" },
    );
  };

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !error) {
          void loadMore();
        }
      },
      { rootMargin: "150% 0%", threshold: 0 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [error, hasMore, loading, loadMore]);

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-h2 text-text-secondary">Failed to load designs</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-content">
      <div className="grid grid-cols-1 items-start gap-5 px-4 py-4 sm:grid-cols-2 sm:px-5 md:grid-cols-3 lg:grid-cols-4 lg:px-8 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((item, i) => (
          <GalleryCard
            key={item.id}
            item={item}
            priority={i < 10}
            featured={isFeaturedCard(i)}
            onCommentClick={onCommentClick}
            href={`/${encodeURIComponent(item.slug || item.id)}`}
            onReact={onReact}
            onFocus={onFocus}
            onSave={onSave}
            focused={visibleFocus?.itemId === item.id}
            dimmed={Boolean(visibleFocus && visibleFocus.itemId !== item.id)}
            reactionCounts={reactionCounts[item.id]}
            liveReactions={reactionsByItem.get(item.id)}
          />
        ))}
      </div>

      {loading && items.length === 0 && (
        <div className="px-4 py-4 sm:px-5 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse ${
                  isFeaturedCard(i) ? "md:col-span-2" : ""
                }`}
              >
                <div
                  className={
                    isFeaturedCard(i)
                      ? "aspect-[16/10] w-full rounded-md bg-bg-tertiary"
                      : "aspect-[4/5] w-full rounded-md bg-bg-tertiary"
                  }
                />
                <div className="mt-2 space-y-1.5">
                  <div className="h-3 bg-bg-tertiary rounded w-3/4" />
                  <div className="h-2.5 bg-bg-tertiary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="relative flex min-h-20 items-center justify-center px-4">
          {hasMore && !error && (
            <div
              ref={loadMoreRef}
              className="absolute inset-0"
              aria-hidden="true"
            />
          )}
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-primary" />
          )}
          {error && (
            <div className="relative z-10 flex flex-col items-center gap-2">
              <p className="text-body text-text-secondary">Couldn&apos;t load more designs</p>
              <Button variant="secondary" onClick={() => void loadMore()}>Try again</Button>
            </div>
          )}
          {!loading && !error && !hasMore && (
            <p className="text-center text-body text-[#A0A0A0]">
              Showing all {items.length} designs
            </p>
          )}
        </div>
      )}

      {visibleFocus ? (
        <FocusBanner
          focus={visibleFocus}
          canEnd={visibleFocus.presenterId === currentUserId}
          replacesYourFocus={replacesYourFocus}
          onJoin={() => void joinFocus()}
          onDecline={() =>
            setDeclinedFocusVersion(visibleFocus.version)
          }
          onEnd={onClearFocus ?? (() => undefined)}
        />
      ) : null}
    </div>
  );
}
