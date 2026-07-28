"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { readableTextColor } from "./cursor-chat-color";
import {
  cursorChatMetrics,
} from "./cursor-chat-metrics";
import { memo, useRef } from "react";
import { useCursorChatPlacement } from "./use-cursor-chat-placement";

interface RemoteCursorProps {
  color: string;
  x: number;
  y: number;
  message?: string;
}

export const RemoteCursor = memo(function RemoteCursor({ color, x, y, message }: RemoteCursorProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
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
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      <svg viewBox="0 0 18 22" fill="none" className="h-[3rem] w-[3.25rem] drop-shadow-sm">
        <path d="M1 1L7 18L9.5 11L16 9.5L1 1Z" fill="#111111" stroke="white" strokeWidth="1.5" />
      </svg>
      <AnimatePresence>
        {message && (
          <motion.div
            ref={bubbleRef}
            initial={
              reduceMotion
                ? false
                : {
                  opacity: 0,
                  scale: 0.94,
                  y: placeAbove ? "0.25rem" : "-0.25rem",
                }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: placeAbove ? "0.1875rem" : "-0.1875rem" }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
