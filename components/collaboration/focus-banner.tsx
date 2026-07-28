"use client";

import { FocusIcon, CloseIcon } from "@/components/ui/icons";
import type { FocusState } from "@/lib/types";

export function FocusBanner({
  focus,
  canEnd,
  replacesYourFocus,
  onJoin,
  onDecline,
  onEnd,
}: {
  focus: FocusState;
  canEnd: boolean;
  replacesYourFocus?: boolean;
  onJoin: () => void;
  onDecline: () => void;
  onEnd: () => void;
}) {
  return (
    <aside className={`fixed left-1/2 top-[4.25rem] z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-btn border px-3 py-2 shadow-modal ${replacesYourFocus ? "border-black/20 bg-[#FFFEF8]" : "border-black/10 bg-white"}`}>
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-white"
        style={{ backgroundColor: focus.presenterColor }}
      >
        <FocusIcon size="1rem" />
      </span>
      <p className="min-w-0 text-button text-primary">
        <span className="font-medium">{focus.presenterName}</span>{" "}
        {replacesYourFocus ? "is requesting a new focus" : "is focusing a reference"}
        {replacesYourFocus ? <span className="block text-caption text-text-secondary">This replaces the reference you were leading.</span> : null}
      </p>
      <button
        type="button"
        onClick={onJoin}
        className="h-7 flex-none rounded-btn bg-primary px-3 text-button text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
      >
        {replacesYourFocus ? "View theirs" : "Join focus"}
      </button>
      {!canEnd ? (
        <button
          type="button"
          onClick={onDecline}
          className="h-7 flex-none rounded-btn bg-bg-tertiary px-3 text-button text-text-secondary transition-colors hover:bg-border-light hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
        >
          {replacesYourFocus ? "Not now" : "Decline"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnd}
          aria-label="End focus"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
        >
          <CloseIcon size="0.875rem" />
        </button>
      )}
    </aside>
  );
}
