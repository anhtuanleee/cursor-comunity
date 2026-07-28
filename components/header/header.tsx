"use client";

import Link from "next/link";
import { BoardIcon, CommentIcon } from "@/components/ui/icons";

const FILTERS = [
  { slug: null, label: "All" },
  { slug: "web", label: "Web" },
  { slug: "interface", label: "Interface" },
  { slug: "branding", label: "Branding" },
  { slug: "product", label: "Product" },
  { slug: "print", label: "Print" },
  { slug: "typography", label: "Typography" },
  { slug: "motion", label: "Motion" },
  { slug: "illustration", label: "Illustration" },
  { slug: "3d", label: "3D" },
];

interface HeaderProps {
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  onlineCount?: number;
  onBoardOpen?: () => void;
}

export function Header({
  activeCategory,
  onCategoryChange,
  onlineCount = 0,
  onBoardOpen,
}: HeaderProps) {
  return (
    <header className="site-header sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-divider bg-white px-4 sm:px-5 lg:px-8">
      <div className="flex items-center gap-8 min-w-0">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
            <span className="text-[0.625rem] font-medium text-white">C</span>
          </div>
          <span className="hidden text-h2 text-primary sm:block">Cursor Community</span>
        </Link>

        <nav data-tour="filters" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.slug || "all"}
              type="button"
              onClick={() => onCategoryChange(f.slug)}
              className={`whitespace-nowrap rounded-badge border-b-2 px-3 py-2 text-button font-normal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 ${
                activeCategory === f.slug
                  ? "text-black font-medium border-black"
                  : "text-text-secondary border-transparent hover:bg-bg-secondary hover:text-black"
              }`}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {onlineCount > 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="relative flex h-3 w-3 items-center justify-center"
            >
              <span className="absolute -inset-0.5 rounded-full border border-[#059669]/50 motion-safe:animate-ping" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-[#059669]" />
            </span>
            <span className="hidden text-body tabular-nums text-text-secondary sm:inline">
              {onlineCount} online
            </span>
          </div>
        ) : null}
        <button
          data-tour="chat-action"
          type="button"
          aria-label="Open cursor chat"
          onClick={() => window.dispatchEvent(new Event("cursor-community:open-chat"))}
          className="flex h-9 items-center gap-1.5 rounded-btn border border-border-divider bg-white px-2.5 text-button text-text-secondary transition-colors hover:border-black/15 hover:text-black"
        >
          <CommentIcon size="0.875rem" />
          <kbd className="rounded-[0.25rem] bg-bg-secondary px-1.5 py-0.5 font-mono text-[0.625rem] text-primary">/</kbd>
          <span className="hidden lg:inline">Chat</span>
        </button>
        <button
          data-tour="shortlist"
          type="button"
          aria-label="Open shortlist"
          onClick={onBoardOpen}
          className="flex h-9 items-center gap-2 rounded-btn bg-bg-tertiary px-3 text-button text-primary transition-colors hover:bg-border-divider"
        >
          <BoardIcon size="1rem" />
          <span className="hidden sm:inline">Shortlist</span>
        </button>
      </div>
    </header>
  );
}
