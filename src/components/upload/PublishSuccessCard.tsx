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
    <div className="flex min-h-[min(100dvh,720px)] flex-col animate-studio-enter">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        {previewUrl ? (
          <video
            src={previewUrl}
            className="aspect-[9/16] max-h-[48dvh] w-full object-cover sm:max-h-[420px]"
            playsInline
            muted
            loop
            autoPlay
            preload="metadata"
          />
        ) : (
          <div className="flex aspect-[9/16] max-h-[48dvh] w-full items-center justify-center bg-black text-[13px] text-white/35">
            Performance preview
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5">
          <span className="inline-flex rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            {successReady ? 'Live' : 'Processing'}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/18">
          <IconCheck className="h-8 w-8 text-accent" />
        </div>
        <h2 className="font-display text-[1.35rem] font-bold leading-tight text-white md:text-[1.5rem]">
          {successReady ? "You're live" : 'Upload complete'}
        </h2>
        <p className="mt-2 max-w-[20rem] text-[14px] leading-relaxed text-white/55">
          {successReady
            ? 'Your performance is on BeTalent. Share it or keep creating.'
            : 'We are finishing processing. You can open it from your videos anytime.'}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left">
        <p className="text-[15px] font-medium leading-snug text-white">{title || 'Performance'}</p>
        <p className="mt-1 text-[12px] text-white/45">
          {styleLabel || 'Style'}{durationSec > 0 ? ` · ${durationSec}s` : ''}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <Link
          href={viewHref}
          className="btn-primary flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold touch-manipulation"
        >
          <IconUpload className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
          View performance
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/feed"
            className="flex h-[48px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-[14px] font-medium text-white/85 touch-manipulation [@media(hover:hover)]:hover:bg-white/[0.07]"
          >
            Feed
          </Link>
          <Link
            href="/profile/me"
            className="flex h-[48px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-[14px] font-medium text-white/85 touch-manipulation [@media(hover:hover)]:hover:bg-white/[0.07]"
          >
            Profile
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="flex h-[48px] items-center justify-center rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/65 touch-manipulation [@media(hover:hover)]:hover:bg-white/[0.05]"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/65 touch-manipulation [@media(hover:hover)]:hover:bg-white/[0.05]"
          >
            <IconShare className="h-4 w-4" aria-hidden />
            Share
          </button>
        </div>
        <button
          type="button"
          onClick={onUploadAnother}
          className="mt-1 min-h-[48px] text-[14px] font-medium text-white/40 underline decoration-white/15 underline-offset-4 [@media(hover:hover)]:hover:text-white/65"
        >
          Upload another
        </button>
      </div>

      {shareMessage ? (
        <p className="mt-3 text-center text-[13px] text-white/50" aria-live="polite">
          {shareMessage}
        </p>
      ) : null}
    </div>
  );
}
