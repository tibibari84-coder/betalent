'use client';

import { useState, useEffect, useRef, type LegacyRef, type RefObject } from 'react';
import { IconArrowLeft, IconChevronRight, IconUpload } from '@/components/ui/Icons';
import type { RecordingMode } from '@/constants/recording-modes';
import type { StudioPreviewFraming } from '@/hooks/useStudioRecorder';
import { cn } from '@/lib/utils';
import { btnGhost, btnPrimary, studioIconBtn, studioPanel } from './studio-tokens';
import ViewfinderFrame from './ViewfinderFrame';

export type StudioReviewStepProps = {
  reviewUrl: string | null;
  reviewVideoRef: RefObject<HTMLVideoElement | null>;
  reviewDurationSec: number;
  mode: RecordingMode;
  previewFraming: StudioPreviewFraming;
  primaryActionLabel?: string;
  onRetake: () => void;
  onEditSession: () => void;
  onUseTake: () => void;
};

export default function StudioReviewStep(props: StudioReviewStepProps) {
  const {
    reviewUrl,
    reviewVideoRef,
    reviewDurationSec,
    mode: _mode,
    previewFraming: _previewFraming,
    primaryActionLabel = 'Publish performance',
    onRetake,
    onEditSession,
    onUseTake,
  } = props;

  const [narrow, setNarrow] = useState(false);
  const [progress, setProgress] = useState(0);
  const swipeFrom = useRef<{ x: number; y: number; fromTop: boolean; fromBottom: boolean } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    if (!narrow || !reviewUrl) return;
    const v = reviewVideoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => {});
    }
  }, [narrow, reviewUrl, reviewVideoRef]);

  const toggleReviewPlayback = () => {
    const v = reviewVideoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const onImmersiveTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const y = t.clientY;
    const h = window.innerHeight;
    swipeFrom.current = {
      x: t.clientX,
      y,
      fromTop: y < h * 0.22,
      fromBottom: y > h * 0.72,
    };
  };

  const onImmersiveTouchEnd = (e: React.TouchEvent) => {
    const s = swipeFrom.current;
    swipeFrom.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - s.y;
    const dx = Math.abs(t.clientX - s.x);
    if (s.fromTop && dy > 96 && dy > dx * 1.25) {
      onRetake();
      return;
    }
    if (s.fromBottom && dy < -72 && Math.abs(dy) > dx * 1.25) {
      onUseTake();
    }
  };

  return (
    <div
      className={cn('fixed inset-0 z-[120] animate-studio-enter', narrow ? 'bg-black' : studioPanel)}
      style={{ minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      {narrow ? (
        <div
          className="relative h-full w-full touch-manipulation"
          onTouchStart={onImmersiveTouchStart}
          onTouchEnd={onImmersiveTouchEnd}
        >
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
            {reviewUrl ? (
              <button
                type="button"
                onClick={toggleReviewPlayback}
                className="relative flex h-full w-full cursor-pointer items-center justify-center border-0 bg-black p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
                aria-label="Tap to play or pause preview"
              >
                {/*
                  Recorded blob: contain + center — same idea as live preview (no cover zoom on playback).
                */}
                <video
                  ref={reviewVideoRef as LegacyRef<HTMLVideoElement>}
                  src={reviewUrl}
                  className="max-h-full max-w-full bg-black object-contain"
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  disablePictureInPicture
                  disableRemotePlayback
                  onTimeUpdate={(ev) => {
                    const v = ev.currentTarget;
                    if (!v.duration || !Number.isFinite(v.duration)) return;
                    setProgress((v.currentTime / v.duration) * 100);
                  }}
                />
              </button>
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 z-[10]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.75) 100%)',
              }}
              aria-hidden
            />
          </div>

          <header
            className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-3 pb-12 pt-[max(10px,env(safe-area-inset-top))]"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.82) 0%, transparent 100%)' }}
          >
            <button type="button" onClick={onRetake} className={cn(studioIconBtn, 'h-11 w-11')} aria-label="Re-record">
              <IconArrowLeft className="!h-5 !w-5" />
            </button>
            <span className="text-[13px] font-semibold tracking-wide text-white/88">Preview</span>
            <div className="h-11 w-11 shrink-0" aria-hidden />
          </header>

          <div className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40">
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white/50 transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center text-[11px] tabular-nums text-white/40">{reviewDurationSec}s</p>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 z-50 flex flex-col gap-2 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-6"
            style={{
              background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)',
            }}
          >
            <button
              type="button"
              onClick={onUseTake}
              className="btn-primary flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold shadow-[0_8px_32px_rgba(196,18,47,0.35)]"
            >
              {primaryActionLabel}
              <IconChevronRight className="h-5 w-5 opacity-90" aria-hidden />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRetake}
                className={`${btnGhost} min-h-[48px] flex-1 justify-center border-white/[0.1] bg-white/[0.04] text-white/75`}
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={onEditSession}
                title="Leave studio"
                className={`${btnGhost} min-h-[48px] flex-1 justify-center border-white/[0.08] bg-transparent text-white/45`}
              >
                Exit
              </button>
            </div>
            <p className="pb-1 text-center text-[10px] text-white/30">
              Swipe down to re-record · swipe up to continue to publish
            </p>
          </div>
        </div>
      ) : (
        <div
          className="h-full overflow-hidden px-3 sm:px-8 md:px-9"
          style={{
            paddingTop: 'max(8px, env(safe-area-inset-top))',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex h-full w-full flex-col overflow-hidden">
            <header className="shrink-0 pb-2 pt-0.5">
              <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42 sm:text-[10px]">BeTalent Studio</p>
                  <p className="truncate text-[12px] text-white/82 sm:text-[13px]">Review take</p>
                </div>
                <p className="shrink-0 text-[11px] tabular-nums text-white/50">{reviewDurationSec}s</p>
              </div>
            </header>

            <section className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 sm:py-4">
              <div className="w-full max-w-[560px]">
                <ViewfinderFrame corners>
                  <div
                    className="relative flex aspect-[9/16] max-h-[min(68dvh,780px)] w-full max-w-[min(100%,420px)] items-center justify-center overflow-hidden rounded-[24px] bg-black shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9)] ring-1 ring-white/12"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 z-[10]"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.04) 35%, rgba(0,0,0,0.03) 65%, rgba(0,0,0,0.32) 100%)',
                      }}
                      aria-hidden
                    />
                    {reviewUrl && (
                      <video
                        ref={reviewVideoRef as LegacyRef<HTMLVideoElement>}
                        src={reviewUrl}
                        className="relative z-[1] h-full w-full bg-black object-contain"
                        controls
                        playsInline
                      />
                    )}
                  </div>
                </ViewfinderFrame>
              </div>
            </section>

            <footer className="shrink-0 pb-[max(6px,env(safe-area-inset-bottom))] pt-2">
              <div
                className="mx-auto w-full max-w-[560px] rounded-[20px] border border-white/[0.12] px-3 py-3 sm:px-4 sm:py-4"
                style={{
                  background: 'linear-gradient(180deg, rgba(16,16,18,0.7) 0%, rgba(8,8,10,0.82) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 44px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/36">Review</p>
                <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                  <button type="button" onClick={onRetake} className={`${btnGhost} min-h-[52px] w-full justify-center sm:w-auto`}>
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={onEditSession}
                    title="Leave studio"
                    className={`${btnGhost} min-h-[50px] w-full justify-center text-white/55 sm:w-auto`}
                  >
                    Exit
                  </button>
                  <button
                    type="button"
                    onClick={onUseTake}
                    className={`${btnPrimary} inline-flex min-h-[56px] w-full items-center justify-center gap-2 sm:w-auto sm:min-w-[220px]`}
                  >
                    <IconUpload className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                    {primaryActionLabel}
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
