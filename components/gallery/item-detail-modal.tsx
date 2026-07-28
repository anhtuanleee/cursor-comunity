"use client";

import { startTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";
import type { GalleryItem } from "@/lib/types";
import { addTransitionType, ViewTransition } from "@/lib/view-transition";
import { ItemDetailContent } from "./item-detail-content";

export function ItemDetailModal({ item }: { item: GalleryItem }) {
  const router = useRouter();
  const close = useCallback(() => {
    startTransition(() => {
      addTransitionType("detail-close");
      router.push("/", { scroll: false });
    });
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
      <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-6 lg:p-10" role="dialog" aria-modal="true" aria-label={item.title}>
        <button
          type="button"
          aria-label="Close reference details"
          onClick={close}
          className="absolute inset-0 bg-[#0A0A0A]/85 backdrop-blur-[0.5rem]"
        />
        <div data-lenis-prevent className="relative z-10 max-h-full w-full max-w-[76rem] overflow-y-auto pr-1">
          <button
            type="button"
            aria-label="Close reference details"
            onClick={close}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-[background-color,transform] hover:scale-105 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-white/60"
          >
            <CloseIcon size="1rem" />
          </button>
          <ItemDetailContent item={item} />
        </div>
      </div>
    </ViewTransition>
  );
}
