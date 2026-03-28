'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Short heading above actions */
  title: string;
  /** Optional secondary line (brand / context) */
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Mobile-first bottom sheet for video actions (••• menu).
 * Portaled to body; respects safe area; blocks background scroll while open.
 */
export default function VideoActionsSheet({ open, onClose, title, subtitle, children }: Props) {
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
        className="absolute inset-0 bg-black/65 backdrop-blur-md active:bg-black/70"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="video-actions-sheet-enter absolute inset-x-0 bottom-0 flex max-h-[min(78dvh,600px)] flex-col rounded-t-[26px] border border-white/[0.12] border-b-0 shadow-[0_-20px_64px_rgba(0,0,0,0.65)]"
        style={{
          background:
            'linear-gradient(180deg, rgba(22,22,28,0.97) 0%, rgba(10,10,12,0.99) 100%)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3.5 pb-1">
          <div className="h-1 w-12 shrink-0 rounded-full bg-white/[0.22]" aria-hidden />
        </div>
        <div className="px-4 pb-2.5 text-center">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-white/50">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-[11px] font-medium tracking-[0.12em] text-white/32">{subtitle}</p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
