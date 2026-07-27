"use client";

import { useEffect, useRef } from "react";
import { useItems } from "@/hooks/use-items";
import { GalleryCard } from "./gallery-card";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/lib/types";

interface GalleryGridProps {
  category: string | null;
  onCommentClick: (item: GalleryItem) => void;
  onItemClick?: (item: GalleryItem) => void;
}

export function GalleryGrid({ category, onCommentClick, onItemClick }: GalleryGridProps) {
  const { items, loading, error, hasMore, loadMore } = useItems(category);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !error) {
          void loadMore();
        }
      },
      { rootMargin: "800px 0px", threshold: 0 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [error, hasMore, loading, loadMore]);

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-h1 text-text-secondary">Failed to load designs</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-x-4 gap-y-5 px-4 sm:px-6 lg:px-8 py-4">
        {items.map((item, i) => (
          <GalleryCard key={item.id} item={item} priority={i < 10}
            onCommentClick={() => onCommentClick(item)} onClick={() => onItemClick?.(item)} />
        ))}
      </div>

      {loading && items.length === 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-x-4 gap-y-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="mb-5 break-inside-avoid animate-pulse">
                <div className="bg-bg-tertiary rounded-md w-full aspect-[4/5]" />
                <div className="mt-2 space-y-1.5">
                  <div className="h-3 bg-bg-tertiary rounded w-3/4" />
                  <div className="h-2.5 bg-bg-tertiary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 border-2 border-[#E0E0E0] border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {error && items.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-body text-text-secondary">Couldn&apos;t load more designs</p>
          <Button variant="secondary" onClick={() => void loadMore()}>Try again</Button>
        </div>
      )}

      {hasMore && !error && (
        <div
          ref={loadMoreRef}
          className="h-1 w-full"
          aria-hidden="true"
        />
      )}

      {!loading && !hasMore && items.length > 0 && (
        <p className="text-center py-8 text-body text-[#A0A0A0]">Showing all {items.length} designs</p>
      )}
    </div>
  );
}
