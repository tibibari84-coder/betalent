'use client';

import { useEffect, useState } from 'react';
import { IconChevronRight } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { btnGhost, btnPrimary } from './studio-tokens';

export type StudioPublishSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Caption / hashtags in one field (first line can be title on upload form). */
  onContinue: (caption: string) => void;
  initialCaption?: string;
};

export default function StudioPublishSheet({
  open,
  onClose,
  onContinue,
  initialCaption = '',
}: StudioPublishSheetProps) {
  const [caption, setCaption] = useState(initialCaption);

  useEffect(() => {
    if (open) setCaption(initialCaption);
  }, [open, initialCaption]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[130] touch-manipulation bg-black/72 backdrop-blur-sm"
        aria-label="Close publish panel"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-[131] max-h-[min(92dvh,720px)] touch-manipulation',
          'rounded-t-[28px] border border-white/[0.1] border-b-0',
          'bg-[linear-gradient(180deg,rgba(22,22,26,0.98)_0%,rgba(8,8,10,0.99)_100%)]',
          'px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_80px_rgba(0,0,0,0.85)]',
          'animate-in fade-in slide-in-from-bottom-4 duration-300'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-publish-title"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <h2 id="studio-publish-title" className="mb-1 text-center text-[15px] font-semibold tracking-tight text-white">
          Publish
        </h2>
        <p className="mb-4 text-center text-[12px] text-white/45">Caption & hashtags</p>
        <label htmlFor="studio-publish-caption" className="sr-only">
          Caption and hashtags
        </label>
        <textarea
          id="studio-publish-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption… #hashtags"
          rows={5}
          className="mb-4 w-full min-h-[140px] resize-none rounded-2xl border border-white/[0.12] bg-white/[0.05] px-4 py-3.5 text-[16px] leading-relaxed text-white placeholder:text-white/35 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
          autoComplete="off"
          autoCorrect="on"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={cn(btnGhost, 'min-h-[52px] flex-1 justify-center')}>
            Back
          </button>
          <button
            type="button"
            onClick={() => onContinue(caption.trim())}
            className={cn(btnPrimary, 'inline-flex min-h-[52px] flex-[1.35] items-center justify-center gap-2')}
          >
            Continue
            <IconChevronRight className="h-5 w-5 opacity-90" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
