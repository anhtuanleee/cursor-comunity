"use client";

import { Avatar } from "@/components/ui/avatar";
import { MediaCover } from "@/components/ui/media-cover";
import { LinkIcon } from "@/components/ui/icons";
import type { GalleryItem } from "@/lib/types";
import { ViewTransition } from "@/lib/view-transition";

export function ItemDetailContent({ item }: { item: GalleryItem }) {
  const media = item.cover_url || item.gallery?.[0]?.url || "";
  const width = item.gallery?.[0]?.width || 4;
  const height = item.gallery?.[0]?.height || 5;
  const publisher = item.creator_name || "Original publisher";

  return (
    <article className="relative grid overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0d0e0d] text-white shadow-[0_2rem_6rem_rgba(0,0,0,0.52)] lg:grid-cols-[minmax(0,1.55fr)_minmax(23rem,0.85fr)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:2.5rem_2.5rem]" />
      <section className="relative z-10 flex min-h-[22rem] items-center justify-center overflow-hidden bg-[#d8d5ce] p-3 sm:min-h-[34rem] sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.92),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.36),transparent_42%,rgba(0,0,0,0.18))]" />
        <div className="absolute bottom-0 left-0 top-0 w-[0.3125rem] bg-[#efff75]" />
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="flex h-7 items-center rounded-full border border-black/10 bg-white/75 px-3 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-black/65 backdrop-blur">
            Signal / 01
          </span>
          <span className="hidden h-7 items-center rounded-full bg-black/80 px-3 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/75 backdrop-blur sm:flex">
            {item.category_name || "Visual reference"}
          </span>
        </div>
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
            className="relative max-h-[68vh] w-full rounded-[1rem] border border-black/10 object-contain shadow-[0_1.25rem_3rem_rgba(0,0,0,0.28)]"
          />
        </ViewTransition>
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
          <p className="rounded-full bg-white/65 px-3 py-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-black/55 backdrop-blur">
            Ref / {item.id.slice(-5).toUpperCase()}
          </p>
          <span className="hidden font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-black/45 sm:block">
            Curated for the room
          </span>
        </div>
      </section>

      <section className="relative z-10 flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#171917_0%,#0b0c0b_62%,#10110e_100%)] p-5 sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-0 font-mono text-[7rem] font-medium leading-none tracking-[-0.12em] text-white/[0.035] sm:text-[8.5rem]">01</span>
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <span className="inline-flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-white/48">
            <span className="h-1.5 w-1.5 rounded-full bg-[#efff75] shadow-[0_0_0.75rem_rgba(239,255,117,0.8)]" />
            Live reference
          </span>
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/35">
            {item.category_name || "Selected"}
          </span>
        </div>

        <div className="relative py-6 sm:py-8">
          <div className="mb-4 flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-[#efff75]/75">
            <span className="h-px w-6 bg-[#efff75]/60" />
            Editor signal
          </div>
          <h1 className="max-w-[24rem] text-balance text-[1.875rem] font-medium leading-[2.125rem] tracking-[-0.06em] text-white sm:text-[2.5rem] sm:leading-[2.75rem]">
            {item.title}
          </h1>
          {item.description ? (
            <p className="mt-5 max-w-[25rem] text-body leading-[1.625rem] text-white/62">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="relative mt-auto space-y-4 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                src={item.creator_avatar}
                name={item.creator_name || publisher}
                size="md"
                className="ring-1 ring-[#efff75]/35"
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
              className="inline-flex h-[2.5rem] shrink-0 items-center gap-2 rounded-full border border-[#efff75]/45 bg-[#efff75] px-3.5 text-[0.75rem] font-medium text-black transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0.625rem_1.5rem_rgba(239,255,117,0.18)] focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-[#efff75]/65"
            >
              Visit reference
              <LinkIcon size="0.875rem" />
            </a>
          </div>

          {item.tags?.length ? (
            <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/35">Signal index</span>
                <span className="font-mono text-[0.5625rem] text-white/30">{String(Math.min(item.tags.length, 6)).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.tags.slice(0, 6).map(tag => (
                  <span key={tag.id} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-[0.4375rem] text-[0.6875rem] text-white/65 transition-colors hover:border-[#efff75]/45 hover:text-[#efff75]">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}
