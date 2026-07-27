"use client";

import { AnimatePresence, motion } from "framer-motion";

interface RemoteCursorProps { color: string; x: number; y: number; message?: string; }

export function RemoteCursor({ color, x, y, message }: RemoteCursorProps) {
  return (
    <motion.div className="absolute pointer-events-none will-change-transform" style={{ left: 0, top: 0 }}
      animate={{ x, y }}
      transition={{ duration: 0.04, ease: "easeOut" }}>
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none" className="drop-shadow-sm">
        <path d="M1 1L7 18L9.5 11L16 9.5L1 1Z" fill={color} stroke="white" strokeWidth="1.5" />
      </svg>
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -3 }}
            style={{ backgroundColor: color }}
            className="absolute left-4 top-5 max-w-64 break-words rounded-lg rounded-tl-sm px-3 py-2 text-body text-white shadow-[0_3px_12px_rgba(0,0,0,0.16)]"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
