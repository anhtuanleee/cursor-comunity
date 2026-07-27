"use client";

import { AnimatePresence } from "framer-motion";
import { CommentPanel } from "./comment-panel";
import type { GalleryItem } from "@/lib/types";
import { useComments } from "@/hooks/use-comments";

interface CommentLayerProps {
  activeItem: GalleryItem | null;
  onClose: () => void;
}

export function CommentLayer({ activeItem, onClose }: CommentLayerProps) {
  const { comments, error, addComment, addReply } = useComments(activeItem?.id);

  return (
    <AnimatePresence>
      {activeItem && (
        <CommentPanel
          item={activeItem}
          comments={comments}
          error={error}
          onClose={onClose}
          onAddComment={addComment}
          onAddReply={addReply}
        />
      )}
    </AnimatePresence>
  );
}
