"use client";

import { memo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { MediaCover } from "@/components/ui/media-cover";
import {
  BoardIcon,
  CommentIcon,
  EyeIcon,
  FocusIcon,
  HeartIcon,
  LinkIcon,
  QuestionIcon,
  UsefulIcon,
} from "@/components/ui/icons";
import type {
  GalleryItem,
  LiveReaction,
  ReactionCounts,
  ReactionKind,
} from "@/lib/types";
import { ViewTransition } from "@/lib/view-transition";
import { DetailLink } from "./detail-link";

interface GalleryCardProps {
  item: GalleryItem;
  priority?: boolean;
  onCommentClick: (item: GalleryItem) => void;
  href?: string;
  onReact?: (item: GalleryItem, kind: ReactionKind) => void;
  onFocus?: (item: GalleryItem) => void;
  onSave?: (item: GalleryItem) => void;
  reactionCounts?: ReactionCounts;
  liveReactions?: LiveReaction[];
  focused?: boolean;
  dimmed?: boolean;
  featured?: boolean;
}

const REACTIONS: Array<{
  kind: ReactionKind;
  label: string;
  icon: typeof HeartIcon;
}> = [
  { kind: "love", label: "Love", icon: HeartIcon },
  { kind: "useful", label: "Useful", icon: UsefulIcon },
  { kind: "question", label: "Question", icon: QuestionIcon },
];

function GalleryCardComponent({
  item,
  priority,
  onCommentClick,
  href,
  onReact,
  onFocus,
  onSave,
  reactionCounts,
  liveReactions = [],
  focused = false,
  dimmed = false,
  featured = false,
}: GalleryCardProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.cover_url || (item.gallery?.[0]?.url ?? "");
  const imageWidth = item.gallery?.[0]?.width || 4;
  const imageHeight = item.gallery?.[0]?.height || 5;

  return (
    <article
      data-item-id={item.id}
      data-tour="reference-card"
      className={`group relative transition-opacity duration-200 [content-visibility:auto] [contain-intrinsic-size:auto_28rem] ${
        featured ? "md:col-span-2" : ""
      } ${
        dimmed ? "opacity-40" : "opacity-100"
      }`}
    >
      {href ? (
        <DetailLink
          href={href}
          aria-label={`Open ${item.title}`}
          className="absolute inset-0 z-[1] rounded-[0.75rem] focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-black focus-visible:ring-offset-[0.1875rem]"
        />
      ) : null}

      <div
        className={`relative cursor-pointer overflow-hidden bg-bg-secondary transition-shadow ${
          focused
            ? "ring-[0.1875rem] ring-black ring-offset-[0.1875rem]"
            : ""
        }`}
        style={{
          aspectRatio: featured
            ? "16 / 10"
            : `${imageWidth} / ${imageHeight}`,
        }}
      >
        <ViewTransition name={`reference-media-${item.id}`} share="morph" default="none">
          {!imgError ? (
            <MediaCover
              src={imageUrl}
              alt={item.title}
              priority={priority}
              width={imageWidth}
              height={imageHeight}
              onError={() => setImgError(true)}
              className="h-full w-full transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-tertiary">
              <span className="text-body text-[#A0A0A0]">No image</span>
            </div>
          )}
        </ViewTransition>

        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center gap-1">
          {liveReactions
            .filter(reaction => reaction.delta > 0)
            .map(reaction => {
              const Icon =
                REACTIONS.find(option => option.kind === reaction.kind)?.icon ??
                HeartIcon;
              return (
                <span
                  key={reaction.id}
                  className="animate-reaction-float flex h-8 w-8 items-center justify-center rounded-full border border-white/70 text-white shadow-floating"
                  style={{ backgroundColor: reaction.userColor }}
                >
                  <Icon size="1rem" />
                </span>
              );
            })}
        </div>

        <div data-tour="card-actions" className="pointer-events-none absolute inset-0 z-[2] flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar src={item.creator_avatar} name={item.creator_name} size="sm" />
              <span className="max-w-[10rem] truncate text-body font-medium text-white">
                {item.creator_name}
              </span>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-caption text-white/80">
              {item.category_name}
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {item.tags?.slice(0, 4).map(tag => (
              <span
                key={tag.id}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[0.6875rem] text-white backdrop-blur-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {REACTIONS.map(reaction => {
                const Icon = reaction.icon;
                const count = reactionCounts?.[reaction.kind] ?? 0;
                return (
                  <button
                    key={reaction.kind}
                    type="button"
                    data-tour={reaction.kind === "love" ? "reaction-action" : undefined}
                    aria-label={`${reaction.label}: ${count}`}
                    onClick={event => {
                      event.stopPropagation();
                      onReact?.(item, reaction.kind);
                    }}
                    className="pointer-events-auto flex h-7 items-center gap-1 rounded-btn bg-black/30 px-2 text-caption text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
                  >
                    <Icon size="0.875rem" />
                    {count > 0 ? count : null}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-tour="focus-action"
                aria-label={focused ? "End focus" : "Focus together"}
                onClick={event => {
                  event.stopPropagation();
                  onFocus?.(item);
                }}
                className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                  focused
                    ? "bg-white text-black"
                    : "bg-black/30 text-white hover:bg-white hover:text-black"
                }`}
              >
                <FocusIcon size="0.875rem" />
              </button>
              <button
                type="button"
                data-tour="shortlist-action"
                aria-label="Add to shortlist"
                onClick={event => {
                  event.stopPropagation();
                  onSave?.(item);
                }}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
              >
                <BoardIcon size="0.875rem" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-caption text-white/70">
              <span className="inline-flex items-center gap-1">
                <EyeIcon size={14} />
                {item.stats?.views ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <LinkIcon size={14} />
                {item.stats?.clicks ?? 0}
              </span>
            </div>
            <button
              type="button"
              data-tour="comment-action"
              onClick={event => {
                event.stopPropagation();
                onCommentClick(item);
              }}
              className="pointer-events-auto flex items-center gap-1 text-button text-white transition-colors hover:text-white/80"
            >
              <CommentIcon size={15} />
              Comment
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-[2] mt-2 px-0.5">
        <h3 className="line-clamp-1 text-body font-normal leading-[1.21875rem] text-primary">
          {item.title}
        </h3>
        {item.description ? (
          <p className="mt-0.5 line-clamp-2 text-body leading-[1.21875rem] text-text-secondary">
            {item.description}
          </p>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar src={item.creator_avatar} name={item.creator_name} size="sm" />
          <span className="text-caption text-text-secondary">
            {item.creator_name}
          </span>
        </div>
      </div>
    </article>
  );
}

export const GalleryCard = memo(GalleryCardComponent);
