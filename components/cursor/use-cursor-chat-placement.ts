"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  cursorChatMetrics,
  pixelsToRem,
  remToPixels,
  rootRemSize,
} from "./cursor-chat-metrics";

export type CursorChatPlacement =
  | "right-below"
  | "left-below"
  | "right-above"
  | "left-above";

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface PlacementResult {
  placement: CursorChatPlacement;
  maxWidth: string;
}

const CANDIDATES: CursorChatPlacement[] = [
  "right-below",
  "left-below",
  "right-above",
  "left-above",
];

function overflowScore(
  placement: CursorChatPlacement,
  anchor: Point,
  bubble: Size,
  viewport: Size,
  rootSize: number,
) {
  const gapX = remToPixels(cursorChatMetrics.gapX, rootSize);
  const gapY = remToPixels(cursorChatMetrics.gapY, rootSize);
  const inset = remToPixels(cursorChatMetrics.viewportPadding, rootSize);
  const onLeft = placement.startsWith("left");
  const above = placement.endsWith("above");
  const left = onLeft ? anchor.x - gapX - bubble.width : anchor.x + gapX;
  const top = above ? anchor.y - gapY - bubble.height : anchor.y + gapY;
  const right = left + bubble.width;
  const bottom = top + bubble.height;

  return (
    Math.max(0, inset - left) +
    Math.max(0, right - (viewport.width - inset)) +
    Math.max(0, inset - top) +
    Math.max(0, bottom - (viewport.height - inset))
  );
}

export function resolveCursorChatPlacement({
  anchor,
  bubble,
  viewport,
  previous,
  rootSize,
}: {
  anchor: Point;
  bubble: Size;
  viewport: Size;
  previous: CursorChatPlacement | null;
  rootSize: number;
}): PlacementResult {
  let best = CANDIDATES[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of CANDIDATES) {
    const score = overflowScore(
      candidate,
      anchor,
      bubble,
      viewport,
      rootSize,
    );
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  if (previous) {
    const previousScore = overflowScore(
      previous,
      anchor,
      bubble,
      viewport,
      rootSize,
    );
    const hysteresis = remToPixels(1, rootSize);
    if (previousScore <= bestScore + hysteresis) best = previous;
  }

  const gapX = remToPixels(cursorChatMetrics.gapX, rootSize);
  const inset = remToPixels(cursorChatMetrics.viewportPadding, rootSize);
  const availableWidth = best.startsWith("left")
    ? anchor.x - gapX - inset
    : viewport.width - anchor.x - gapX - inset;
  const maxWidth = Math.max(
    rootSize,
    Math.min(
      remToPixels(cursorChatMetrics.maxWidth, rootSize),
      availableWidth,
    ),
  );

  return { placement: best, maxWidth: pixelsToRem(maxWidth, rootSize) };
}

export function useCursorChatPlacement(
  anchor: Point | null,
  bubbleRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const previousRef = useRef<CursorChatPlacement | null>(null);
  const [bubbleSize, setBubbleSize] = useState<Size>({
    width: remToPixels(cursorChatMetrics.minInputWidth),
    height: remToPixels(cursorChatMetrics.inputHeight),
  });
  const [viewport, setViewport] = useState<Size>(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const [rootSize, setRootSize] = useState(rootRemSize);

  useLayoutEffect(() => {
    if (!enabled) return;
    const element = bubbleRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setBubbleSize(current =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [bubbleRef, enabled]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRootSize(rootRemSize());
    };
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, [enabled]);

  return useMemo(() => {
    if (!anchor) {
      return {
        placement: previousRef.current ?? "right-below",
        maxWidth: `${cursorChatMetrics.maxWidth}rem`,
      };
    }
    const result = resolveCursorChatPlacement({
      anchor,
      bubble: bubbleSize,
      viewport,
      previous: previousRef.current,
      rootSize,
    });
    previousRef.current = result.placement;
    return result;
  }, [anchor, bubbleSize, rootSize, viewport]);
}
