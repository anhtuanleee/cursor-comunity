"use client";

import { readableTextColor } from "./cursor-chat-color";
import {
  cursorChatMetrics,
} from "./cursor-chat-metrics";
import { forwardRef, memo, useRef, type Ref } from "react";
import { useCursorChatPlacement } from "./use-cursor-chat-placement";

interface RemoteCursorProps {
  color: string;
  x: number;
  y: number;
  message?: string;
}

export const RemoteCursor = memo(forwardRef(function RemoteCursor({
  color,
  x,
  y,
  message,
}: RemoteCursorProps, ref: Ref<HTMLDivElement>) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { placement, maxWidth } = useCursorChatPlacement(
    { x, y },
    bubbleRef,
    Boolean(message),
  );
  const placeLeft = placement.startsWith("left");
  const placeAbove = placement.endsWith("above");
  const textColor = readableTextColor(color);

  return (
    <div
      ref={ref}
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      <svg viewBox="0 0 18 22" fill="none" className="h-[3rem] w-[3.25rem] drop-shadow-sm">
        <path d="M1 1L7 18L9.5 11L16 9.5L1 1Z" fill={color} stroke="white" strokeWidth="1.5" />
      </svg>
      {message ? (
          <div
            ref={bubbleRef}
            style={{
              left: `${placeLeft ? -cursorChatMetrics.gapX : cursorChatMetrics.gapX}rem`,
              top: `${placeAbove ? -cursorChatMetrics.gapY : cursorChatMetrics.gapY}rem`,
              translate: `${placeLeft ? "-100%" : "0"} ${placeAbove ? "-100%" : "0"}`,
              maxWidth,
              backgroundColor: color,
              color: textColor,
            }}
            className={`absolute isolate inline-block w-max max-w-full break-words rounded-[0.3125rem_0.875rem_0.875rem_0.875rem] border-[0.0625rem] border-white/80 px-3 py-1.5 text-button font-medium leading-5 shadow-[0_0.125rem_0.5rem_rgba(0,0,0,0.28)] ${placeLeft ? "rounded-[0.875rem_0.3125rem_0.875rem_0.875rem]" : ""
              }`}
          >
            {message}
          </div>
        ) : null}
    </div>
  );
}));
