'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  COMMENT_REACTION_EMOJI,
  COMMENT_REACTION_LABEL,
  COMMENT_REACTION_TYPES,
  type CommentReactionTypeKey,
} from '@/constants/comment-reactions';

export function CommentReactionPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (r: CommentReactionTypeKey) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center md:items-center pointer-events-auto animate-in fade-in duration-150"
      role="dialog"
      aria-label="Choose reaction"
    >
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div
        className="relative mx-3 mb-[max(20px,env(safe-area-inset-bottom))] flex max-w-[min(100vw-24px,420px)] flex-wrap items-center justify-center gap-0.5 rounded-[999px] border border-white/[0.14] px-2 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.75),0_0_0_1px_rgba(196,18,47,0.12)] animate-in fade-in slide-in-from-bottom-2 duration-200 md:mb-0"
        style={{
          background: 'linear-gradient(180deg, rgba(36,36,42,0.98) 0%, rgba(20,20,24,0.99) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {COMMENT_REACTION_TYPES.map((r) => (
          <button
            key={r}
            type="button"
            title={COMMENT_REACTION_LABEL[r]}
            onClick={() => {
              onPick(r);
              onClose();
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full text-[26px] transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span aria-hidden>{COMMENT_REACTION_EMOJI[r]}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
