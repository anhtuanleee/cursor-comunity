"use client";

import { startTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";
import type { GalleryItem } from "@/lib/types";
import { addTransitionType, ViewTransition } from "@/lib/view-transition";
import { ItemDetailContent } from "./item-detail-content";

export function ItemDetailModal({ item }: { item: GalleryItem }) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    startTransition(() => {
      addTransitionType("detail-close");
      router.push("/", { scroll: false });
    });
  }, [router]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [close]);

  return (
    <ViewTransition
      default="none"
      enter={{
        "detail-open": "slide-from-right",
        "detail-close": "slide-from-left",
        default: "scale-in",
      }}
      exit={{
        "detail-open": "slide-to-left",
        "detail-close": "slide-to-right",
        default: "scale-out",
      }}
    >
      <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-hidden px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-10">
        <button
          type="button"
          aria-label="Close reference details"
          onClick={close}
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(235,247,103,0.16),transparent_26%),radial-gradient(circle_at_85%_85%,rgba(255,255,255,0.1),transparent_30%),rgba(4,4,4,0.9)] backdrop-blur-[0.75rem]"
        />
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
          className="relative z-10 max-h-full w-full max-w-[80rem] overflow-y-auto overscroll-contain rounded-[1.75rem] pr-1"
        >
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close reference details"
            onClick={close}
            className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-[0_0.75rem_1.5rem_rgba(0,0,0,0.25)] backdrop-blur transition-[background-color,transform,border-color] hover:scale-105 hover:border-[#efff75] hover:bg-[#efff75] hover:text-black focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-[#efff75] sm:right-5 sm:top-5"
          >
            <CloseIcon size="1rem" />
          </button>
          <ItemDetailContent item={item} />
        </div>
      </div>
    </ViewTransition>
  );
}
