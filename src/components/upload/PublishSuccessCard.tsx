'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconShare, IconUpload } from '@/components/ui/Icons';

type Props = {
  successReady: boolean;
  successVideoId: string | null;
  previewUrl: string | null;
  title: string;
  styleLabel: string;
  durationSec: number;
  onUploadAnother: () => void;
};

export default function PublishSuccessCard(props: Props) {
  const { successReady, successVideoId, previewUrl, title, styleLabel, durationSec, onUploadAnother } = props;
  const [shareMessage, setShareMessage] = useState('');

  const getShareUrl = useCallback(() => {
    const targetPath = successVideoId ? `/video/${successVideoId}` : '/my-videos';
    return typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;
  }, [successVideoId]);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = getShareUrl();
      const nav =
        typeof window !== 'undefined'
          ? (window.navigator as Navigator & { clipboard?: { writeText: (text: string) => Promise<void> } })
          : null;
      const clip = nav?.clipboard;
      if (clip?.writeText) {
        await clip.writeText(url);
        setShareMessage('Link copied');
        return;
      }
      setShareMessage('Copy is not available on this device.');
    } catch {
      setShareMessage('Could not copy link right now.');
    }
  }, [getShareUrl]);

  const handleShare = useCallback(async () => {
    const url = getShareUrl();

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: title || 'My BETALENT performance',
          text: 'Watch my BETALENT performance.',
          url,
        });
        setShareMessage('Shared.');
        return;
      }
      await handleCopyLink();
    } catch {
      setShareMessage('Could not share right now.');
    }
  }, [getShareUrl, handleCopyLink, title]);

  useEffect(() => {
    if (!shareMessage) return;
    const id = window.setTimeout(() => setShareMessage(''), 2200);
    return () => window.clearTimeout(id);
  }, [shareMessage]);

  const viewHref = successReady && successVideoId ? `/video/${successVideoId}` : '/my-videos';

  return (
    <div
      className="rounded-[24px] border border-[rgba(255,255,255,0.12)] p-5 md:p-8 animate-studio-enter"
      style={{ background: 'rgba(26,26,28,0.78)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
        <div className="w-full md:w-[280px] shrink-0">
          <div className="relative rounded-[18px] overflow-hidden border border-white/10 bg-black aspect-[9/16] max-h-[420px]">
            {previewUrl ? (
              <video src={previewUrl} className="w-full h-full object-cover" playsInline muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/35 text-[13px]">
                Performance preview
              </div>
            )}
            <div className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-black/65 border border-white/10 text-white/90">
              {successReady ? 'Published' : 'Processing'}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-accent/20">
            <IconCheck className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-display text-[22px] md:text-[28px] font-bold text-text-primary mb-2">
            {successReady ? 'Published successfully' : 'Upload complete'}
          </h2>
          <p className="text-[14px] text-text-secondary mb-4 max-w-[520px]">
            {successReady ? 'Your performance is now live.' : 'Your performance is processing and will be live shortly.'}
          </p>

          <div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4 mb-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-semibold mb-2">Performance details</p>
            <p className="text-[15px] text-white font-medium truncate">{title || 'Untitled performance'}</p>
            <p className="text-[13px] text-white/60 mt-1">
              {styleLabel || 'Style not set'}{durationSec > 0 ? ` · ${durationSec}s` : ''}
            </p>
          </div>

          <div className="rounded-[14px] border border-white/10 bg-white/[0.02] p-4 mb-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-semibold mb-3">Status</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[12px] font-medium border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
                Uploading complete
              </span>
              <span className={`px-3 py-1 rounded-full text-[12px] font-medium border ${successReady ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>
                {successReady ? 'Processing complete' : 'Processing'}
              </span>
              <span className={`px-3 py-1 rounded-full text-[12px] font-medium border ${successReady ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/[0.03] text-white/55'}`}>
                Published successfully
              </span>
            </div>
          </div>

          <div className="rounded-[14px] border border-white/10 bg-white/[0.02] p-4 mb-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-semibold mb-3">Actions</p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Link
                href={viewHref}
                className="btn-primary flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-[12px] touch-manipulation"
              >
                <IconUpload className="w-5 h-5" />
                Open video
              </Link>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-[12px] border border-[rgba(255,255,255,0.14)] bg-transparent text-text-primary touch-manipulation active:bg-white/5 [@media(hover:hover)]:hover:bg-white/5 transition-colors"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-[12px] border border-[rgba(255,255,255,0.14)] bg-transparent text-text-primary touch-manipulation active:bg-white/5 [@media(hover:hover)]:hover:bg-white/5 transition-colors"
              >
                <IconShare className="w-5 h-5" />
                Share
              </button>
              <button
                type="button"
                onClick={onUploadAnother}
                className="flex items-center justify-center gap-2 min-h-[46px] px-6 py-3 rounded-[12px] border border-[rgba(255,255,255,0.14)] bg-transparent text-text-primary touch-manipulation active:bg-white/5 [@media(hover:hover)]:hover:bg-white/5 transition-colors"
              >
                Upload another
              </button>
            </div>
          </div>
          {shareMessage && (
            <p className="text-[13px] text-white/60 mt-2" aria-live="polite">
              {shareMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
