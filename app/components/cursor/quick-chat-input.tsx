"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface QuickChatInputProps {
  position: { x: number; y: number } | null;
  color: string;
  onSend: (text: string) => boolean;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function QuickChatInput({ position, color, onSend }: QuickChatInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const positionRef = useRef(position);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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
        setAnchor(positionRef.current || {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        setIsOpen(true);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        setText("");
      }
    };

    document.addEventListener("keydown", handleShortcut, true);
    return () => document.removeEventListener("keydown", handleShortcut, true);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const activePosition = position || anchor;
  if (!isOpen || !activePosition) return null;

  const inputWidth = 200;
  const left = Math.max(12, Math.min(
    activePosition.x - inputWidth - 8,
    window.innerWidth - inputWidth - 12,
  ));
  const top = Math.max(12, Math.min(activePosition.y + 20, window.innerHeight - 44));

  const submit = () => {
    if (!text.trim()) return;
    if (onSend(text)) {
      setText("");
      setIsOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{ left, top, backgroundColor: color }}
      className="pointer-events-auto absolute h-8 w-[200px] max-w-[calc(100vw-24px)] rounded-full border-0 p-0 shadow-[0_2px_6px_rgba(0,0,0,0.24)] outline-none ring-0"
    >
      <svg
        viewBox="0 0 22 24"
        aria-hidden="true"
        className="pointer-events-none absolute -right-[10px] -top-[13px] h-6 w-[22px] overflow-visible"
      >
        <path
          d="M1 18C7 15 13 9 21 1C17 9 16 16 17 23C12 20 7 18 1 18Z"
          fill={color}
        />
      </svg>
      <input
        ref={inputRef}
        value={text}
        maxLength={280}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") {
            setText("");
            setIsOpen(false);
          }
        }}
        placeholder="Type a message…"
        aria-label="Quick chat message"
        className="h-full w-full rounded-full border-0 bg-transparent px-3 text-[14px] font-normal leading-none text-white caret-white outline-none ring-0 placeholder:text-white/60 focus:border-0 focus:outline-none focus:ring-0"
      />
    </motion.div>
  );
}
