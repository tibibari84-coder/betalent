'use client';

import { useState, useEffect, type LegacyRef, type RefObject } from 'react';
import { IconArrowLeft, IconUpload } from '@/components/ui/Icons';
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
    previewFraming,
    primaryActionLabel = 'Publish performance',
    onRetake,
    onEditSession,
    onUseTake,
  } = props;

  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  return (
    <div
      className={cn('fixed inset-0 z-[120] animate-studio-enter', narrow ? 'bg-black' : studioPanel)}
      style={{ minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      <div
        className={cn('h-full overflow-hidden', narrow ? 'px-0' : 'px-3 sm:px-8 md:px-9')}
        style={{
          paddingTop: narrow ? '0' : 'max(8px, env(safe-area-inset-top))',
          paddingBottom: narrow ? '0' : 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {narrow ? (
            <header
              className="relative z-50 flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
            >
              <button type="button" onClick={onRetake} className={cn(studioIconBtn, 'h-10 w-10')} aria-label="Re-record">
                <IconArrowLeft className="!h-5 !w-5" />
              </button>
              <p className="text-[11px] font-medium tabular-nums text-white/55">{reviewDurationSec}s</p>
              <div className="h-10 w-10 shrink-0" aria-hidden />
            </header>
          ) : (
            <header className="shrink-0 pb-2 pt-0.5">
              <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42 sm:text-[10px]">BeTalent Studio</p>
                  <p className="truncate text-[12px] text-white/82 sm:text-[13px]">Review take</p>
                </div>
                <p className="shrink-0 text-[11px] tabular-nums text-white/50">{reviewDurationSec}s</p>
              </div>
            </header>
          )}

          <section className={cn('flex min-h-0 flex-1 flex-col', narrow ? 'py-0' : 'items-center justify-center py-2 sm:py-4')}>
            <div className={cn('w-full', narrow ? 'flex min-h-0 flex-1 flex-col' : 'max-w-[560px]')}>
              <ViewfinderFrame corners={!narrow}>
                <div
                  className={cn(
                    'relative overflow-hidden bg-black md:aspect-[9/16]',
                    narrow
                      ? 'min-h-0 flex-1 rounded-none ring-0'
                      : 'aspect-[9/16] rounded-[24px] shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9)] ring-1 ring-white/12'
                  )}
                  style={
                    narrow
                      ? { aspectRatio: previewFraming.stageAspect, minHeight: 'min(52dvh, 520px)' }
                      : { height: 'min(68dvh, 780px)', aspectRatio: previewFraming.stageAspect }
                  }
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-[10]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.03) 62%, rgba(0,0,0,0.4) 100%)',
                    }}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-[5%] z-[11] rounded-lg border border-white/[0.07]"
                    aria-hidden
                  />
                  {reviewUrl && (
                    <video
                      ref={reviewVideoRef as LegacyRef<HTMLVideoElement>}
                      src={reviewUrl}
                      className="relative z-[1] h-full w-full bg-black"
                      style={{
                        objectFit: narrow ? 'cover' : previewFraming.fit,
                        objectPosition: previewFraming.objectPosition,
                      }}
                      controls
                      playsInline
                    />
                  )}
                </div>
              </ViewfinderFrame>
            </div>
          </section>

          <footer
            className={cn(
              'shrink-0',
              narrow
                ? 'border-0 bg-transparent pb-[max(12px,env(safe-area-inset-bottom))] pt-2'
                : 'pb-[max(6px,env(safe-area-inset-bottom))] pt-2'
            )}
          >
            {narrow ? (
              <div className="flex flex-col gap-2 px-4">
                <button type="button" onClick={onUseTake} className={`${btnPrimary} min-h-[52px] w-full justify-center gap-2`}>
                  <IconUpload className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                  {primaryActionLabel}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={onRetake} className={`${btnGhost} min-h-[48px] flex-1 justify-center text-white/70`}>
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={onEditSession}
                    title="Returns to session prep and discards this take"
                    className={`${btnGhost} min-h-[48px] flex-1 justify-center text-white/45`}
                  >
                    Edit session
                  </button>
                </div>
              </div>
            ) : (
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
                    title="Returns to session prep and discards this take"
                    className={`${btnGhost} min-h-[50px] w-full justify-center text-white/55 sm:w-auto`}
                  >
                    Edit session
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
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
