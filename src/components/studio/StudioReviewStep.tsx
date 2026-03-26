'use client';

import type { LegacyRef, RefObject } from 'react';
import { IconUpload } from '@/components/ui/Icons';
import type { RecordingMode } from '@/constants/recording-modes';
import { btnGhost, btnPrimary, studioPanel } from './studio-tokens';
import ViewfinderFrame from './ViewfinderFrame';
import { getStudioModeCopy } from './studio-mode-copy';

export type StudioReviewStepProps = {
  reviewUrl: string | null;
  reviewVideoRef: RefObject<HTMLVideoElement | null>;
  reviewDurationSec: number;
  mode: RecordingMode;
  onRetake: () => void;
  onEditSession: () => void;
  onUseTake: () => void;
};

export default function StudioReviewStep(props: StudioReviewStepProps) {
  const { reviewUrl, reviewVideoRef, reviewDurationSec, mode, onRetake, onEditSession, onUseTake } = props;
  const copy = getStudioModeCopy(mode);

  return (
    <div className={`${studioPanel} animate-studio-enter`} style={{ minHeight: 'calc(100svh - 24px)' }}>
      <div
        className="p-3 sm:p-8 md:p-9 space-y-5 sm:space-y-8"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-accent/90 font-semibold">{copy.reviewLabel}</span>
            <span className="text-white/25 hidden sm:inline">·</span>
            <span className="text-[11px] text-white/40 tabular-nums">{reviewDurationSec}s take</span>
          </div>
          <h3 className="font-display text-[1.35rem] sm:text-[1.5rem] font-bold text-white tracking-tight">{copy.reviewTitle}</h3>
          <p className="text-[13px] text-white/48 max-w-md leading-relaxed">
            {copy.reviewDescription}
          </p>
        </div>

        <ViewfinderFrame>
          <div
            className="relative rounded-[20px] sm:rounded-[22px] overflow-hidden ring-1 ring-white/10 bg-black aspect-[9/16] shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
            style={{ minHeight: 'min(64svh, 640px)', maxHeight: 'min(72svh, 720px)' }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-[12] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.35)_100%)]"
              aria-hidden
            />
            {reviewUrl && (
              <video
                ref={reviewVideoRef as LegacyRef<HTMLVideoElement>}
                src={reviewUrl}
                className="relative z-[1] w-full h-full object-cover object-[50%_35%]"
                controls
                playsInline
              />
            )}
          </div>
        </ViewfinderFrame>

        <div className="rounded-[16px] border border-white/10 bg-white/[0.02] p-3 sm:p-4 max-w-lg mx-auto w-full">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-stretch sm:items-center flex-wrap">
          <button type="button" onClick={onRetake} className={`${btnGhost} justify-center order-2 sm:order-1 min-h-[54px]`}>
            Re-record
          </button>
          <button
            type="button"
            onClick={onEditSession}
            title="Returns to session prep and discards this take"
            className={`${btnGhost} justify-center order-3 sm:order-2 text-white/55 min-h-[52px]`}
          >
            Edit session
          </button>
          <button
            type="button"
            onClick={onUseTake}
            className={`${btnPrimary} order-1 sm:order-3 inline-flex items-center justify-center gap-2 flex-1 sm:flex-initial min-w-0 min-h-[56px]`}
          >
            <IconUpload className="w-5 h-5 shrink-0 opacity-95" aria-hidden />
            Publish performance
          </button>
          </div>
        </div>
        <p className="text-center text-[11px] sm:text-[12px] text-white/38 tracking-wide max-w-sm mx-auto leading-relaxed">
          Routed through the standard BETALENT upload &amp; processing queue.
        </p>
      </div>
    </div>
  );
}
