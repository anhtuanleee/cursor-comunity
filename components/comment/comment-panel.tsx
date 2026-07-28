"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MediaCover } from "@/components/ui/media-cover";
import { CommentIcon } from "@/components/ui/icons";
import { readableTextColor } from "@/components/cursor/cursor-chat-color";
import { useUser } from "@/providers/user-provider";
import type { GalleryItem, Comment } from "@/lib/types";

interface CommentPanelProps {
  item: GalleryItem;
  comments: Comment[];
  error: string | null;
  onClose: () => void;
  onAddComment: (text: string) => Promise<void>;
  onAddReply: (commentId: string, text: string) => Promise<void>;
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommentPanel({ item, comments, error, onClose, onAddComment, onAddReply }: CommentPanelProps) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const accentColor = user?.color || "#202020";
  const accentTextColor = readableTextColor(accentColor);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(text.trim());
      setText("");
    } catch {
      // The hook exposes a user-facing error message.
    } finally {
      setSubmitting(false);
    }
  };
  const handleReplySubmit = async (cid: string) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddReply(cid, replyText.trim());
      setReplyText("");
      setReplyTo(null);
    } catch {
      // The hook exposes a user-facing error message.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close comments"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 border-0 bg-black/30 p-0"
        onClick={onClose}
      />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[26rem] flex-col overflow-hidden bg-[#F5F5F2] shadow-[-0.75rem_0_2.5rem_rgba(0,0,0,0.16)]">


        {/* Header */}
        <div className="relative flex h-[5.5rem] flex-shrink-0 items-center justify-between overflow-hidden border-b border-black/10 bg-[#121212] px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.18),transparent_30%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.08))]" />
          <div className="relative flex min-w-0 items-center gap-3">
            <MediaCover
              src={item.cover_url || (item.gallery?.[0]?.url ?? "")}
              alt={item.title}
              className="h-[3.25rem] w-[3.25rem] flex-shrink-0 rounded-[0.625rem] border border-white/20 object-cover shadow-[0_0.375rem_1rem_rgba(0,0,0,0.28)]"
            />
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/45">Notes on reference</p>
              <h2 className="truncate text-body font-medium text-white">{item.title}</h2>
              <p className="truncate text-caption text-white/55">{comments.length} {comments.length === 1 ? "thought" : "thoughts"} collected</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close comments"
            onClick={onClose}
            className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div data-lenis-prevent className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_100%_0%,rgba(0,0,0,0.045),transparent_28%),radial-gradient(circle_at_0_100%,rgba(0,0,0,0.04),transparent_32%)] px-4 py-5">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.125rem] border border-dashed border-black/20 bg-white shadow-[0_0.375rem_1.25rem_rgba(0,0,0,0.06)]">
                <CommentIcon size={24} className="text-text-secondary" />
              </span>
              <p className="text-body font-medium text-black">Start a visual conversation</p>
              <p className="mt-1 max-w-[13rem] text-caption leading-[1.125rem] text-text-secondary">Leave a thought, a question, or a detail worth remembering.</p>
            </div>
          ) : (comments.map(comment => (
            <div key={comment.id} className="relative pb-5 last:pb-0" style={{ "--comment-color": comment.user_color } as CSSProperties}>
              <div className="absolute bottom-0 left-[0.6875rem] top-[1.75rem] w-px bg-black/8 last:hidden" />
              <div className="relative flex gap-3">
                <Avatar name={comment.user_name} color={comment.user_color} size="md" className="mt-0.5 ring-2 ring-[#F5F5F2] shadow-[0_0.1875rem_0.5rem_rgba(0,0,0,0.1)]" />
                <div className="min-w-0 flex-1 rounded-[0.25rem_1rem_1rem_1rem] border border-black/8 bg-white p-3 shadow-[0_0.25rem_0.875rem_rgba(0,0,0,0.055)]">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-black">{comment.user_name}</span>
                    <span className="text-caption text-[#A0A0A0]">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-body leading-[1.3125rem] text-text-secondary">{comment.text}</p>
                  <button
                    type="button"
                    onClick={() => setReplyTo(replyTo===comment.id?null:comment.id)}
                    className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-[#8A8A8A] transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                  >
                    ↳ Reply
                  </button>
                  {replyTo===comment.id && (
                    <div className="mt-3 flex gap-2 border-t border-black/6 pt-3">
                      <input
                        name="reply"
                        autoComplete="off"
                        aria-label={`Reply to ${comment.user_name}`}
                        value={replyText}
                        onChange={e=>setReplyText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter") void handleReplySubmit(comment.id); }}
                        placeholder="Write a reply…"
                        autoFocus
                        className="h-8 flex-1 rounded-[0.625rem] border border-border-light bg-[#F7F7F7] px-2.5 text-body placeholder-[#A0A0A0] focus:border-[#5A5A5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={()=>void handleReplySubmit(comment.id)}
                        disabled={!replyText.trim() || submitting}
                        style={replyText.trim() && !submitting ? { backgroundColor: accentColor, color: accentTextColor } : undefined}
                      >
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {comment.replies?.map(reply=> (
                <div key={reply.id} className="relative ml-10 mt-3 flex gap-2.5" style={{ "--comment-color": reply.user_color } as CSSProperties}>
                  <span className="absolute -left-5 top-4 h-px w-3 bg-black/15" />
                  <Avatar name={reply.user_name} color={reply.user_color} size="sm" className="mt-0.5 shadow-[0_0.125rem_0.375rem_rgba(0,0,0,0.08)]" />
                  <div className="min-w-0 flex-1 rounded-[0.875rem_0.875rem_0.875rem_0.25rem] border border-black/7 bg-white/70 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-black">{reply.user_name}</span>
                      <span className="text-caption text-[#A0A0A0]">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="mt-1 text-body leading-[1.25rem] text-text-secondary">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )))}
          <div ref={bottomRef} />
        </div>
        <div className="flex-shrink-0 border-t border-black/8 bg-white/80 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            {user && (
              <Avatar
                name={user.name}
                color={user.color}
                size="md"
                className="ring-2 ring-white shadow-[0_0.125rem_0.5rem_rgba(0,0,0,0.12)]"
              />
            )}
            <div
              style={{ "--comment-accent": accentColor } as CSSProperties}
              className="flex min-w-0 flex-1 items-center rounded-[1rem] border border-[#E5E5E5] bg-[#F7F7F8] p-[0.1875rem] shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[var(--comment-accent)] focus-within:bg-white focus-within:shadow-[0_0_0_0.1875rem_color-mix(in_srgb,var(--comment-accent)_18%,transparent)]"
            >
              <input
                ref={inputRef}
                name="comment"
                autoComplete="off"
                aria-label="Add a comment"
                value={text}
                onChange={e=>setText(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") void handleSubmit(); }}
                placeholder="Add a thoughtful comment…"
                className="h-[2.25rem] min-w-0 flex-1 bg-transparent px-[0.625rem] font-sans text-body text-[#202020] placeholder:text-[#9A9A9A] focus:outline-none"
              />
              <button
                type="button"
                aria-label="Send comment"
                onClick={()=>void handleSubmit()}
                disabled={!text.trim() || submitting}
                style={text.trim() && !submitting ? { backgroundColor: accentColor, color: accentTextColor } : undefined}
                className="inline-flex h-[2.25rem] shrink-0 items-center justify-center gap-[0.375rem] rounded-[0.75rem] bg-[#202020] px-[0.75rem] font-sans text-[0.8125rem] font-medium text-white shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.16)] transition-[transform,background-color,opacity,box-shadow] duration-150 hover:brightness-95 hover:shadow-[0_0.1875rem_0.5rem_rgba(0,0,0,0.18)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:bg-[#E3E3E3] disabled:text-[#929292] disabled:shadow-none"
              >
                <span>{submitting ? "Sending" : "Send"}</span>
                <svg aria-hidden="true" width="0.875rem" height="0.875rem" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2 7.6 8.4M14 2 9.9 14l-2.3-5.6L2 6.1 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-caption text-red-600" aria-live="polite">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
