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

  if (!isOpen || !anchor) return null;

  const left = Math.max(12, Math.min(anchor.x + 24, window.innerWidth - 344));
  const top = Math.max(12, Math.min(anchor.y + 24, window.innerHeight - 72));

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
      className="pointer-events-auto absolute w-[320px] max-w-[calc(100vw-24px)] rounded-full border-[3px] border-white p-1 shadow-[0_5px_12px_rgba(0,0,0,0.3)]"
    >
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
        className="h-12 w-full rounded-full bg-transparent px-5 text-[22px] font-normal leading-none text-white caret-white outline-none placeholder:text-white/60"
      />
    </motion.div>
  );
}
