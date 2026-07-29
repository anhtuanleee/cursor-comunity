"use client";

import { pixelsToRem, rootRemSize } from "./cursor-chat-metrics";

interface LocalCursorProps {
  position: { x: number; y: number };
}

/**
 * The local pointer is a real overlay instead of a CSS cursor so it remains
 * visible while an input owns focus (and so we do not fall back to native UI).
 */
export function LocalCursor({ position }: LocalCursorProps) {
  const rootSize = rootRemSize();

  return (
    <div
      aria-hidden="true"
      className="absolute z-30 pointer-events-none will-change-transform"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${pixelsToRem(position.x, rootSize)}, ${pixelsToRem(position.y, rootSize)}, 0)`,
      }}
    >
      <svg
        viewBox="0 0 18 22"
        fill="none"
        className="h-[3rem] w-[3.25rem] drop-shadow-sm"
      >
        <path
          d="M1 1L7 18L9.5 11L16 9.5L1 1Z"
          fill="#111111"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
