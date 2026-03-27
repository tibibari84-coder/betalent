'use client';

import type { LegacyRef, RefObject } from 'react';
import { IconUpload } from '@/components/ui/Icons';
import type { RecordingMode } from '@/constants/recording-modes';
import type { StudioPreviewFraming } from '@/hooks/useStudioRecorder';
import { btnGhost, btnPrimary, studioPanel } from './studio-tokens';
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
  const { reviewUrl, reviewVideoRef, reviewDurationSec, mode: _mode, previewFraming, primaryActionLabel = 'Publish performance', onRetake, onEditSession, onUseTake } = props;

  return (
    <div className={`fixed inset-0 z-[120] ${studioPanel} animate-studio-enter`} style={{ minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div
        className="h-full overflow-hidden px-3 sm:px-8 md:px-9"
        style={{
          paddingTop: 'max(8px, env(safe-area-inset-top))',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="h-full w-full flex flex-col overflow-hidden">
          <header className="shrink-0 pt-0.5 pb-2">
            <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/42 font-semibold">BETALENT Studio</p>
                <p className="text-[12px] sm:text-[13px] text-white/82 truncate">Review take before publish</p>
              </div>
              <p className="text-[11px] text-white/50 tabular-nums shrink-0">{reviewDurationSec}s</p>
            </div>
          </header>

          <section className="flex-1 min-h-0 flex items-center justify-center py-2 sm:py-4">
            <div className="w-full max-w-[560px]">
              <ViewfinderFrame>
                <div
                  className="relative rounded-[24px] overflow-hidden ring-1 ring-white/12 bg-black aspect-[9/16] shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9)]"
                  style={{ height: 'min(68dvh, 780px)', aspectRatio: previewFraming.stageAspect }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-[10]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.03) 62%, rgba(0,0,0,0.4) 100%)',
                    }}
                    aria-hidden
                  />
                  {reviewUrl && (
                    <video
                      ref={reviewVideoRef as LegacyRef<HTMLVideoElement>}
                      src={reviewUrl}
                      className="relative z-[1] h-full w-full bg-black"
                      style={{ objectFit: previewFraming.fit, objectPosition: previewFraming.objectPosition }}
                      controls
                      playsInline
                    />
                  )}
                </div>
              </ViewfinderFrame>
            </div>
          </section>

          <footer className="shrink-0 pt-2 pb-[max(6px,env(safe-area-inset-bottom))]">
            <div
              className="mx-auto w-full max-w-[560px] rounded-[20px] border border-white/[0.12] px-3 py-3 sm:px-4 sm:py-4"
              style={{
                background: 'linear-gradient(180deg, rgba(16,16,18,0.7) 0%, rgba(8,8,10,0.82) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 44px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(18px)',
              }}
            >
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/36 font-semibold mb-2.5">Review controls</p>
              <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:items-center sm:gap-3">
                <button type="button" onClick={onRetake} className={`${btnGhost} justify-center min-h-[52px] w-full sm:w-auto`}>
                  Re-record
                </button>
                <button
                  type="button"
                  onClick={onEditSession}
                  title="Returns to session prep and discards this take"
                  className={`${btnGhost} justify-center text-white/55 min-h-[50px] w-full sm:w-auto`}
                >
                  Edit session
                </button>
                <button
                  type="button"
                  onClick={onUseTake}
                  className={`${btnPrimary} inline-flex items-center justify-center gap-2 min-h-[56px] w-full sm:w-auto sm:min-w-[220px]`}
                >
                  <IconUpload className="w-5 h-5 shrink-0 opacity-95" aria-hidden />
                  {primaryActionLabel}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
