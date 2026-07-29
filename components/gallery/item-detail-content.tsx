"use client";

import { Avatar } from "@/components/ui/avatar";
import { MediaCover } from "@/components/ui/media-cover";
import { LinkIcon } from "@/components/ui/icons";
import type { GalleryItem } from "@/lib/types";
import { ViewTransition } from "@/lib/view-transition";

function sourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Original source";
  }
}

export function ItemDetailContent({ item }: { item: GalleryItem }) {
  const media = item.cover_url || item.gallery?.[0]?.url || "";
  const width = item.gallery?.[0]?.width || 4;
  const height = item.gallery?.[0]?.height || 5;
  const publisher = sourceLabel(item.source_url);

  return (
    <article className="grid overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101010] text-white shadow-[0_1.5rem_5rem_rgba(0,0,0,0.42)] lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.82fr)]">
      <div className="relative flex min-h-[20rem] items-center justify-center overflow-hidden bg-[#D9D5CD] p-3 sm:min-h-[31rem] sm:p-5">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.54),transparent_38%,rgba(0,0,0,0.13))]" />
        <div className="absolute bottom-0 left-0 top-0 w-[0.375rem] bg-black/10" />
        <span className="absolute left-5 top-5 z-10 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-black/60 backdrop-blur">
          Visual reference
        </span>
        {/* The gallery card remains mounted behind an intercepted modal. Keep
            this transition unnamed so React never mounts duplicate shared
            element names at the same time. */}
        <ViewTransition default="none">
          <MediaCover
            src={media}
            alt={item.title}
            width={width}
            height={height}
            priority
            className="relative max-h-[66vh] w-full rounded-[0.875rem] object-contain shadow-[0_1rem_2.5rem_rgba(0,0,0,0.2)]"
          />
        </ViewTransition>
        <p className="absolute bottom-5 left-5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-black/45">
          CURSOR / {item.id.slice(-5).toUpperCase()}
        </p>
      </div>

      <div className="relative flex min-h-0 flex-col overflow-hidden bg-[#101010] p-5 sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute right-5 top-3 font-mono text-[5rem] font-medium leading-none tracking-[-0.12em] text-white/[0.035] sm:right-7 sm:text-[6.5rem]">01</span>
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/45">
            {item.category_name || "Selected reference"}
          </span>
          <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
        </div>

        <div className="relative py-7">
          <div className="mb-5 flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/35">
            <span className="h-px w-5 bg-white/30" />
            Curation note
          </div>
          <h1 className="max-w-[22rem] text-[1.75rem] font-medium leading-[2rem] tracking-[-0.05em] text-white sm:text-[2.25rem] sm:leading-[2.5rem]">
            {item.title}
          </h1>
          {item.description ? (
            <p className="mt-5 max-w-[23rem] text-body leading-[1.5rem] text-white/60">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="relative mt-auto border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                src={item.creator_avatar}
                name={item.creator_name || publisher}
                size="md"
                className="ring-1 ring-white/20"
              />
              <div className="min-w-0">
                <p className="truncate text-button text-white/90">
                  {item.creator_name || publisher}
                </p>
                <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.1em] text-white/40">
                  Original publisher
                </p>
              </div>
            </div>
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[2.5rem] shrink-0 items-center gap-2 rounded-full border border-white/20 px-3.5 text-[0.75rem] font-medium text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-white/35"
            >
              Visit
              <LinkIcon size="0.875rem" />
            </a>
          </div>

          {item.tags?.length ? (
            <div className="mt-7 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/35">Signals</span>
                <span className="font-mono text-[0.5625rem] text-white/30">{String(Math.min(item.tags.length, 6)).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.tags.slice(0, 6).map(tag => (
                  <span key={tag.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-[0.4375rem] text-[0.6875rem] text-white/65 transition-colors hover:border-white/30 hover:text-white">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
