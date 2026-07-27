"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header/header";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { CursorOverlay } from "@/components/cursor/cursor-overlay";
import { CommentLayer } from "@/components/comment/comment-layer";
import type { GalleryItem } from "@/lib/types";
import { useSocket } from "@/providers/socket-provider";

export default function Home() {
  const { onlineCount } = useSocket();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [commentItem, setCommentItem] = useState<GalleryItem | null>(null);

  const handleCommentClick = useCallback((item: GalleryItem) => {
    setCommentItem(item);
  }, []);

  const handleItemClick = useCallback((item: GalleryItem) => {
    try {
      const url = new URL(item.source_url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      }
    } catch {
      // Ignore malformed source URLs.
    }
  }, []);

  return (
    <>
      <Header
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onlineCount={onlineCount}
      />

      <main>
        <GalleryGrid
          category={activeCategory}
          onCommentClick={handleCommentClick}
          onItemClick={handleItemClick}
        />
      </main>

      <CursorOverlay />
      <CommentLayer activeItem={commentItem} onClose={() => setCommentItem(null)} />
    </>
  );
}
