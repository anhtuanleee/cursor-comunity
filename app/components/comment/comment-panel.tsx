"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-white z-50 flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.15)]">


        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-divider flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img src={item.cover_url || (item.gallery?.[0]?.url ?? "")} alt={item.title}
              className="h-8 w-8 rounded object-cover flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-body font-medium text-black truncate">{item.title}</h2>
              <p className="text-caption text-[#A0A0A0] truncate">by {item.creator_name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="#5A5A5A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-2xl">💬</span><p className="text-body text-[#A0A0A0]">No comments yet</p>
            </div>
          ) : (comments.map(comment => (
            <div key={comment.id} className="space-y-3">
              <div className="flex gap-2.5">
                <Avatar name={comment.user_name} color={comment.user_color} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-black">{comment.user_name}</span>
                    <span className="text-caption text-[#A0A0A0]">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-body text-text-secondary mt-0.5 leading-[19.5px]">{comment.text}</p>
                  <button onClick={() => setReplyTo(replyTo===comment.id?null:comment.id)}
                    className="text-caption text-[#A0A0A0] hover:text-text-secondary mt-1 transition-colors">Reply</button>
                  {replyTo===comment.id && (
                    <div className="flex gap-2 mt-2">
                      <input value={replyText} onChange={e=>setReplyText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter") void handleReplySubmit(comment.id); }}
                        placeholder="Write a reply..." autoFocus
                        className="flex-1 h-7 px-2.5 text-body border border-border-light rounded-input focus:outline-none focus:border-[#5A5A5A] placeholder-[#A0A0A0]" />
                      <Button variant="primary" size="sm" onClick={()=>void handleReplySubmit(comment.id)} disabled={!replyText.trim() || submitting}>Reply</Button>
                    </div>
                  )}
                </div>
              </div>
              {comment.replies?.map(reply=>(
                <div key={reply.id} className="flex gap-2.5 ml-8">
                  <Avatar name={reply.user_name} color={reply.user_color} size="sm" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-black">{reply.user_name}</span>
                      <span className="text-caption text-[#A0A0A0]">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-body text-text-secondary mt-0.5 leading-[19.5px]">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )))}
          <div ref={bottomRef} />
        </div>
        <div className="px-4 py-3 border-t border-border-divider flex-shrink-0">
          <div className="flex gap-2 items-center">
            {user && <Avatar name={user.name} color={user.color} size="sm" className="flex-shrink-0" />}
            <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") void handleSubmit(); }}
              placeholder="Add a comment..."
              className="flex-1 h-9 px-3 text-body border border-border-light rounded-input focus:outline-none focus:border-[#5A5A5A] placeholder-[#A0A0A0]" />
            <Button variant="primary" onClick={()=>void handleSubmit()} disabled={!text.trim() || submitting}>Send</Button>
          </div>
          {error && <p className="mt-2 text-caption text-red-600">{error}</p>}
        </div>
      </motion.div>
    </>
  );
}
