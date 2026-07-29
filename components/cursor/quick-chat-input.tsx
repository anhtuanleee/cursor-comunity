"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readableTextColor } from "./cursor-chat-color";
import {
  cursorChatMetrics,
  pixelsToRem,
  remToPixels,
  rootRemSize,
} from "./cursor-chat-metrics";
import { useCursorChatPlacement } from "./use-cursor-chat-placement";

interface QuickChatInputProps {
  color: string;
  position: { x: number; y: number } | null;
  visible: boolean;
  onTextChange: (text: string) => void;
  onClear: () => void;
  onExit: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

const PLACEHOLDER = "Type a message…";
const CHAT_IDLE_CLEAR = 5_000;
const CHAT_MODE_IDLE = 10_000;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function QuickChatInput({
  color,
  position,
  visible,
  onTextChange,
  onClear,
  onExit,
  onOpenChange,
}: QuickChatInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const positionRef = useRef(position);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const activePosition = position || anchor;
  const { placement, maxWidth } = useCursorChatPlacement(
    activePosition,
    bubbleRef,
    isOpen,
  );

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const open = useCallback(() => {
    setAnchor(positionRef.current || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    setText("");
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    setText("");
    onExit();
    onOpenChange?.(false);
  }, [onExit, onOpenChange]);

  useEffect(() => {
    if (!visible && isOpen) close();
  }, [close, isOpen, visible]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isSlash =
        event.key === "/" ||
        event.code === "Slash" ||
        event.code === "NumpadDivide";

      if (
        isSlash &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        event.stopPropagation();
        open();
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleShortcut, true);
    return () => document.removeEventListener("keydown", handleShortcut, true);
  }, [close, isOpen, open]);

  useEffect(() => {
    window.addEventListener("cursor-community:open-chat", open);
    return () => window.removeEventListener("cursor-community:open-chat", open);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || bubbleRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || !text) return;
    const clearTimer = setTimeout(() => {
      setText("");
      onClear();
    }, CHAT_IDLE_CLEAR);
    return () => clearTimeout(clearTimer);
  }, [isOpen, onClear, text]);

  useEffect(() => {
    if (!isOpen) return;
    const modeTimer = setTimeout(close, CHAT_MODE_IDLE);
    return () => clearTimeout(modeTimer);
  }, [close, isOpen, text]);

  if (!isOpen || !activePosition) return null;

  const rootSize = rootRemSize();
  const cursorGapX = remToPixels(cursorChatMetrics.gapX, rootSize);
  const cursorGapY = remToPixels(cursorChatMetrics.gapY, rootSize);
  const minInputWidth = remToPixels(cursorChatMetrics.minInputWidth, rootSize);
  const placeOnLeft = placement.startsWith("left");
  const placeBelow = placement.endsWith("below");
  const textColor = readableTextColor(color);
  const bubbleLeft = placeOnLeft
    ? activePosition.x - cursorGapX
    : activePosition.x + cursorGapX;
  const bubbleTop = placeBelow
    ? activePosition.y + cursorGapY
    : activePosition.y - cursorGapY;

  return (
    <div
      ref={bubbleRef}
      style={{
        left: pixelsToRem(bubbleLeft, rootSize),
        top: pixelsToRem(bubbleTop, rootSize),
        translate: `${placeOnLeft ? "-100%" : "0"} ${placeBelow ? "0" : "-100%"}`,
        minWidth: `min(${pixelsToRem(minInputWidth, rootSize)}, ${maxWidth})`,
        maxWidth,
        backgroundColor: color,
        color: textColor,
      }}
      className={`pointer-events-auto absolute isolate inline-grid h-8 grid-cols-[minmax(0,1fr)] rounded-[0.3125rem_0.875rem_0.875rem_0.875rem] border-[0.0625rem] border-white/80 p-0 shadow-[0_0.125rem_0.5rem_rgba(0,0,0,0.28)] outline-none ring-0 ${placeOnLeft ? "rounded-[0.875rem_0.3125rem_0.875rem_0.875rem]" : ""
        }`}
    >
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 block max-w-full overflow-hidden whitespace-pre px-3 text-button font-medium leading-7"
      >
        {text || PLACEHOLDER}
      </span>
      <input
        ref={inputRef}
        value={text}
        maxLength={280}
        onChange={event => {
          const nextText = event.target.value;
          setText(nextText);
          onTextChange(nextText);
        }}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            setText("");
            onClear();
            inputRef.current?.focus();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
        placeholder={PLACEHOLDER}
        aria-label="Cursor chat message"
        style={{ color: textColor, caretColor: textColor }}
        className="col-start-1 row-start-1 h-full min-w-0 w-full rounded-full border-0 bg-transparent px-3 text-button font-medium leading-none outline-none ring-0 placeholder:opacity-70 focus:border-0 focus:outline-none focus:ring-0"
      />
    </div>
  );
}
