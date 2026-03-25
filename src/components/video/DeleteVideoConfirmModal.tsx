'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

/**
 * Portaled to document.body so `position:fixed` is always viewport-relative.
 * Without this, ancestors with `transform` (e.g. profile card hover:scale) break fixed
 * positioning and cause jitter / “vibration” and misplaced UI.
 */
export default function DeleteVideoConfirmModal({ open, title, onClose, onConfirm, deleting }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (e.key === 'Escape' && !deleting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, deleting, onClose]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-video-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !deleting && onClose()}
      />
      <div
        className="relative w-full max-w-[400px] rounded-[20px] border border-white/[0.1] p-6 shadow-2xl"
        style={{ background: 'rgba(14,16,22,0.98)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-video-title" className="text-[18px] font-semibold text-white mb-2">
          Delete this performance?
        </h2>
        <p className="text-[14px] text-[#9ba7b8] mb-6 leading-relaxed">
          <span className="text-white/90 font-medium line-clamp-2 break-words">{title}</span>
          <span className="block mt-2">
            This removes the video from BETALENT and public feeds. This cannot be undone.
          </span>
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold border border-white/15 text-[#e2e8f0] hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-[#b91c1c] hover:bg-[#991b1b] disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
