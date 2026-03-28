'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Short heading above actions (e.g. "Video") */
  title: string;
  children: React.ReactNode;
};

/**
 * Mobile-first bottom sheet for video actions (••• menu).
 * Portaled to body; respects safe area; blocks background scroll while open.
 */
export default function VideoActionsSheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[190] touch-manipulation" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] active:bg-black/60"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="video-actions-sheet-enter absolute inset-x-0 bottom-0 flex max-h-[min(72dvh,560px)] flex-col rounded-t-[22px] border border-white/[0.1] border-b-0 shadow-[0_-12px_48px_rgba(0,0,0,0.55)]"
        style={{
          background: 'rgba(12,14,20,0.98)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-11 shrink-0 rounded-full bg-white/25" aria-hidden />
        </div>
        <p className="px-4 pb-2 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {title}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
