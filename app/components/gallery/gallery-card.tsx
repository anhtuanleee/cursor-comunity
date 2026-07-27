"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import type { GalleryItem } from "@/lib/types";

interface GalleryCardProps {
  item: GalleryItem;
  priority?: boolean;
  onCommentClick: () => void;
  onClick?: () => void;
}

export function GalleryCard({ item, priority, onCommentClick, onClick }: GalleryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = item.cover_url || (item.gallery?.[0]?.url ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5 break-inside-avoid group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative overflow-hidden bg-bg-secondary cursor-pointer">
        {!imgError ? (
          <img src={imageUrl} alt={item.title}
            loading={priority ? "eager" : "lazy"}
            onError={() => setImgError(true)}
            className="w-full h-auto object-cover transition-all duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full aspect-[4/5] flex items-center justify-center bg-bg-tertiary">
            <span className="text-body text-[#A0A0A0]">No image</span>
          </div>
        )}

        {/* Hover Overlay */}
        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar src={item.creator_avatar} name={item.creator_name} size="sm" />
              <span className="text-white text-body font-medium truncate max-w-[160px]">{item.creator_name}</span>
            </div>
            <span className="text-white/80 text-caption bg-white/10 px-2 py-0.5 rounded-full">{item.category_name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.tags?.slice(0, 4).map(tag => (
              <span key={tag.id} className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">{tag.name}</span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white/70 text-caption">
              <span>👁 {item.stats?.views ?? 0}</span>
              <span>🔗 {item.stats?.clicks ?? 0}</span>
            </div>
            <button onClick={e => { e.stopPropagation(); onCommentClick(); }}
              className="text-white text-body hover:text-white/80 transition-colors flex items-center gap-1">
              💬 Comment
            </button>
          </div>
        </motion.div>
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-body font-normal text-primary leading-[19.5px] line-clamp-1">{item.title}</h3>
        {item.description && (
          <p className="text-body text-text-secondary leading-[19.5px] mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <Avatar src={item.creator_avatar} name={item.creator_name} size="sm" />
          <span className="text-caption text-text-secondary">{item.creator_name}</span>
        </div>
      </div>
    </motion.div>
  );
}
