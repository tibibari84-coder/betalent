'use client';

import { useState, useEffect, type LegacyRef, type RefObject } from 'react';
import type { RecordingMode } from '@/constants/recording-modes';
import type { StudioPreviewFraming, StudioRecorderErrorCode, StudioRecorderPhase } from '@/hooks/useStudioRecorder';
import { cn } from '@/lib/utils';
import {
  IconArrowLeft,
  IconArrowPath,
  IconBolt,
  IconClock,
  IconLayoutGrid,
  IconSettings,
  IconSparkles,
  IconX,
} from '@/components/ui/Icons';
import { btnGhost, btnPrimary, btnSecondary, studioIconBtn, studioPanel } from './studio-tokens';
import ViewfinderFrame from './ViewfinderFrame';

export type StudioBoothStepProps = {
  maxDurationSec: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  recPhase: StudioRecorderPhase;
  recElapsedSec: number;
  recError: { code: StudioRecorderErrorCode; message: string } | null;
  micLive: boolean;
  pauseSupported: boolean;
  mode: RecordingMode;
  previewFraming: StudioPreviewFraming;
  showCurtain: boolean;
  switchingLens: boolean;
  boothReady: boolean;
  localError: string;
  onCancelDuringCurtain: () => void;
  onCancelPreview: () => void;
  onRetryPreview: () => void;
  onStartRecording: () => void;
  onFlipCamera: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const DURATION_PRESETS: readonly number[] = [15, 60, 90];
const EFFECT_STRIP = [
  { id: 'n', label: 'Normal' },
  { id: 'c', label: 'Cinema' },
  { id: 'm', label: 'Mono' },
  { id: 'x', label: 'Soon' },
  { id: 'y', label: 'Soon' },
] as const;

export default function StudioBoothStep(props: StudioBoothStepProps) {
  const {
    maxDurationSec,
    videoRef,
    recPhase,
    recElapsedSec,
    recError,
    micLive,
    pauseSupported,
    mode: _mode,
    previewFraming,
    showCurtain,
    switchingLens,
    boothReady,
    localError,
    onCancelDuringCurtain,
    onCancelPreview,
    onRetryPreview,
    onStartRecording,
    onFlipCamera,
    onPause,
    onResume,
    onStop,
  } = props;

  const [narrow, setNarrow] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [effectIdx, setEffectIdx] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const isPreview = boothReady && recPhase === 'preview';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const canSwitchCamera = isPreview && !switchingLens;
  const showStatusOverlay = isPreview || isRecording;

  const videoObjectFit = narrow ? 'cover' : previewFraming.fit;
  const videoObjectPosition = previewFraming.objectPosition;

  const recordPrimary = (
    <>
      {isPreview && !switchingLens && (
        <button
          type="button"
          onClick={onStartRecording}
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-sm transition-transform active:scale-[0.96] md:h-[78px] md:w-[78px]"
          aria-label="Start recording"
        >
          <span className="absolute h-[62px] w-[62px] rounded-full border border-accent/40 md:h-[58px] md:w-[58px]" aria-hidden />
          <span className="h-[52px] w-[52px] rounded-full bg-accent md:h-[50px] md:w-[50px]" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }} />
        </button>
      )}
      {recPhase === 'recording' && (
        <button
          type="button"
          onClick={onStop}
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-sm transition-transform active:scale-[0.96] md:h-[78px] md:w-[78px]"
          aria-label="Stop recording"
        >
          <span className="h-8 w-8 rounded-md bg-white md:h-[34px] md:w-[34px]" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.2)' }} />
        </button>
      )}
      {recPhase === 'paused' && (
        <button
          type="button"
          onClick={onResume}
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-sm transition-transform active:scale-[0.96] md:h-[78px] md:w-[78px]"
          aria-label="Resume recording"
        >
          <span className="h-[52px] w-[52px] rounded-full bg-accent md:h-[58px] md:w-[58px]" />
        </button>
      )}
    </>
  );

  return (
    <>
      {showCurtain && (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6 animate-studio-curtain"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% 38%, rgba(196,18,47,0.12) 0%, transparent 55%), rgba(3,2,6,0.94)',
            backdropFilter: 'blur(12px)',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30 animate-studio-breathe"
            style={{
              background: 'radial-gradient(circle at 50% 45%, rgba(196,18,47,0.25) 0%, transparent 42%)',
            }}
            aria-hidden
          />
          <div className="relative z-[1] max-w-[20rem] space-y-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent/90 sm:text-[11px]">House lights</p>
            <h2 className="font-display text-[1.5rem] font-bold tracking-tight text-white sm:text-[1.75rem]">Preparing camera…</h2>
            <p className="text-[13px] leading-relaxed text-white/55 sm:text-[14px]">
              We need your camera and microphone. When your browser asks, choose <strong className="text-white/80">Allow</strong> so you can
              step into the live room.
            </p>
            <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
            <button
              type="button"
              onClick={onCancelDuringCurtain}
              className="min-h-[44px] px-4 text-[13px] font-medium text-white/45 underline decoration-white/20 underline-offset-4 hover:text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'fixed inset-0 z-[120] animate-studio-enter transition-opacity duration-300',
          narrow ? 'bg-black' : studioPanel,
          narrow && '!mb-0 !rounded-none !border-0 !shadow-none',
          showCurtain && 'pointer-events-none opacity-40'
        )}
        style={{ minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        <div
          className={cn('h-full overflow-hidden', narrow ? 'px-0' : 'px-3 sm:px-6 md:px-8')}
          style={{
            paddingTop: narrow ? '0' : 'max(8px, env(safe-area-inset-top))',
            paddingBottom: narrow ? '0' : 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Mobile: floating top bar */}
            {narrow ? (
              <header
                className="relative z-50 flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
              >
                <button
                  type="button"
                  onClick={onCancelPreview}
                  className={cn(studioIconBtn, 'h-10 w-10')}
                  aria-label="Close studio"
                >
                  <IconX className="!h-5 !w-5" />
                </button>
                <button
                  type="button"
                  disabled
                  className="pointer-events-none rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 text-[11px] font-medium tracking-wide text-white/40 backdrop-blur-md"
                  title="Coming soon"
                >
                  Add sound
                </button>
                <button type="button" disabled className={cn(studioIconBtn, 'h-10 w-10 opacity-40')} aria-label="Settings (soon)" title="Soon">
                  <IconSettings className="!h-5 !w-5" />
                </button>
              </header>
            ) : (
              <header className="shrink-0 pb-2 pt-0.5">
                <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42 sm:text-[10px]">BeTalent Studio</p>
                      <p className="truncate text-[12px] text-white/82 sm:text-[13px]">
                        {isRecording ? 'Recording' : isPreview ? 'Preview' : 'Preparing'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent/90 sm:text-[11px]">9:16</p>
                      <p className="tabular-nums text-[10px] text-white/45">max {maxDurationSec}s</p>
                    </div>
                  </div>
                </div>
              </header>
            )}

            <section className="relative flex min-h-0 flex-1 flex-col md:items-center md:justify-center md:py-4">
              {/* Right control rail — mobile */}
              {narrow ? (
                <div
                  className="absolute bottom-[38%] right-2 z-40 flex flex-col gap-3"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <button
                    type="button"
                    onClick={() => void onFlipCamera()}
                    disabled={!canSwitchCamera}
                    className={studioIconBtn}
                    aria-label="Flip camera"
                  >
                    <IconArrowPath className="!h-5 !w-5" />
                  </button>
                  <button type="button" disabled className={studioIconBtn} aria-label="Flash" title="Coming soon">
                    <IconBolt className="!h-5 !w-5 opacity-50" />
                  </button>
                  <button type="button" disabled className={studioIconBtn} aria-label="Timer" title="Coming soon">
                    <IconClock className="!h-5 !w-5 opacity-50" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrid((v) => !v)}
                    className={cn(studioIconBtn, showGrid && 'border-accent/40 text-accent')}
                    aria-label="Grid guide"
                    aria-pressed={showGrid}
                  >
                    <IconLayoutGrid className="!h-5 !w-5" />
                  </button>
                  <button type="button" disabled className={studioIconBtn} aria-label="Effects" title="Coming soon">
                    <IconSparkles className="!h-5 !w-5 opacity-50" />
                  </button>
                </div>
              ) : null}

              <div className={cn('mx-auto w-full max-w-[560px]', narrow && 'flex min-h-0 flex-1 flex-col')}>
                <ViewfinderFrame corners={!narrow}>
                  <div
                    className={cn(
                      'relative overflow-hidden bg-black md:aspect-[9/16]',
                      narrow
                        ? 'min-h-0 flex-1 rounded-none ring-0'
                        : 'aspect-[9/16] rounded-[24px] shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9),0_0_140px_rgba(196,18,47,0.06)] ring-1 ring-white/12'
                    )}
                    style={
                      narrow
                        ? { aspectRatio: previewFraming.stageAspect, minHeight: 'min(52dvh, 520px)' }
                        : { height: 'min(68dvh, 780px)', aspectRatio: previewFraming.stageAspect }
                    }
                  >
                    <video
                      ref={videoRef as LegacyRef<HTMLVideoElement>}
                      className="absolute inset-0 h-full w-full bg-black"
                      style={{ objectFit: videoObjectFit, objectPosition: videoObjectPosition }}
                      playsInline
                      muted
                    />
                    {showGrid && narrow ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-[12] opacity-[0.22]"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)',
                          backgroundSize: '33.33% 33.33%',
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className="pointer-events-none absolute inset-0 z-[10]"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 22%, rgba(0,0,0,0.03) 58%, rgba(0,0,0,0.48) 100%)',
                      }}
                      aria-hidden
                    />
                    {/* Subtle 9:16 safe framing — not a heavy box */}
                    <div
                      className="pointer-events-none absolute inset-[5%] z-[11] rounded-lg border border-white/[0.07]"
                      aria-hidden
                    />

                    {showStatusOverlay && (
                      <div className="pointer-events-none absolute inset-x-2 top-2 z-[20] flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
                        <div
                          className="rounded-full px-3 py-1.5 font-mono text-[11px] tabular-nums text-white/95 sm:text-[12px]"
                          style={{
                            background: 'rgba(8,8,10,0.72)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <span className="mr-1.5 text-white/45">TC</span>
                          {String(Math.floor(recElapsedSec / 60)).padStart(2, '0')}:{String(recElapsedSec % 60).padStart(2, '0')}
                          <span className="mx-1.5 text-white/30">/</span>
                          <span className="text-white/55">{maxDurationSec}s</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]"
                            style={{
                              background: micLive ? 'rgba(5,28,16,0.82)' : 'rgba(34,17,8,0.82)',
                              border: micLive ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(251,191,36,0.4)',
                              color: micLive ? 'rgba(203,255,226,0.95)' : 'rgba(255,232,188,0.95)',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            {micLive ? 'Mic live' : 'Mic check'}
                          </div>
                          {recPhase === 'recording' && (
                            <div
                              className="rounded-full border border-accent/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                              style={{
                                background: 'rgba(24,5,10,0.88)',
                                boxShadow: '0 0 22px rgba(196,18,47,0.28)',
                              }}
                            >
                              REC
                            </div>
                          )}
                          {recPhase === 'paused' && (
                            <div className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
                              Paused
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-[20] hidden justify-center md:flex">
                      <span className="rounded-full border border-white/[0.08] bg-black/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/38 backdrop-blur-sm">
                        Upper third
                      </span>
                    </div>

                    {switchingLens && boothReady && (
                      <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/72 backdrop-blur-sm">
                        <p className="text-[13px] font-medium text-white/85">Switching camera…</p>
                      </div>
                    )}
                  </div>
                </ViewfinderFrame>
              </div>
            </section>

            <footer
              className={cn(
                'shrink-0',
                narrow
                  ? 'border-0 bg-transparent pb-[max(8px,env(safe-area-inset-bottom))] pt-1'
                  : 'pb-[max(6px,env(safe-area-inset-bottom))] pt-2'
              )}
            >
              {narrow ? (
                <div className="w-full px-3">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {EFFECT_STRIP.map((e, i) => (
                      <button
                        key={e.id + i}
                        type="button"
                        disabled={i > 2}
                        onClick={() => i <= 2 && setEffectIdx(i)}
                        className={cn(
                          'flex shrink-0 flex-col items-center gap-1.5 opacity-100 disabled:opacity-40',
                          i > 2 && 'pointer-events-none'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-full border text-[10px] font-medium transition-colors',
                            effectIdx === i && i <= 2
                              ? 'border-accent/50 bg-accent/15 text-white'
                              : 'border-white/[0.12] bg-black/40 text-white/50'
                          )}
                        >
                          {e.label.slice(0, 2)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-4 flex justify-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {DURATION_PRESETS.map((sec) => {
                      const active = sec === maxDurationSec;
                      return (
                        <span
                          key={sec}
                          className={cn(
                            'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium tabular-nums',
                            active ? 'bg-white/[0.12] text-white' : 'text-white/30'
                          )}
                        >
                          {sec}s
                        </span>
                      );
                    })}
                    {!DURATION_PRESETS.includes(maxDurationSec) ? (
                      <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1.5 text-[12px] font-semibold tabular-nums text-accent">
                        {maxDurationSec}s
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-1">
                    {recPhase === 'preview' ? (
                      <button
                        type="button"
                        onClick={onCancelPreview}
                        className={cn(studioIconBtn, 'h-12 w-12 border-white/10')}
                        aria-label="Back"
                      >
                        <IconArrowLeft className="!h-5 !w-5 opacity-85" />
                      </button>
                    ) : recPhase === 'recording' && pauseSupported ? (
                      <button type="button" onClick={onPause} className={cn(studioIconBtn, 'h-12 w-12 border-white/10')} aria-label="Pause recording">
                        <span className="flex gap-0.5" aria-hidden>
                          <span className="h-4 w-1 rounded-sm bg-white/90" />
                          <span className="h-4 w-1 rounded-sm bg-white/90" />
                        </span>
                      </button>
                    ) : recPhase === 'paused' ? (
                      <button type="button" onClick={onStop} className={cn(studioIconBtn, 'h-12 w-12 border-white/10')} aria-label="Stop recording">
                        <span className="h-3.5 w-3.5 rounded-sm bg-white/90" aria-hidden />
                      </button>
                    ) : (
                      <div className="h-12 w-12 shrink-0" aria-hidden />
                    )}
                    <div className="flex flex-1 justify-center">{recordPrimary}</div>
                    {recPhase === 'preview' ? (
                      <button
                        type="button"
                        onClick={() => void onFlipCamera()}
                        disabled={!canSwitchCamera}
                        className={cn(studioIconBtn, 'h-12 w-12 border-white/10')}
                        aria-label="Flip camera"
                      >
                        <IconArrowPath className="!h-5 !w-5" />
                      </button>
                    ) : (
                      <div className="h-12 w-12 shrink-0" aria-hidden />
                    )}
                  </div>
                  <p className="mt-2 text-center text-[9px] font-medium uppercase tracking-[0.2em] text-white/25">Preview-only looks · no pipeline change</p>
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
                  <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/36">
                    {isRecording ? 'Recording' : isPreview ? 'Preview' : 'Studio'}
                  </p>
                  <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
                    <button type="button" onClick={onCancelPreview} className={`${btnGhost} min-h-[48px] min-w-[72px] px-3 text-white/60`}>
                      Back
                    </button>
                    {recordPrimary}
                    <button
                      type="button"
                      onClick={onFlipCamera}
                      className={`${btnGhost} min-h-[48px] min-w-[72px] px-3`}
                      disabled={!canSwitchCamera || recPhase !== 'preview'}
                    >
                      Flip
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                    {isPreview && !switchingLens && (
                      <>
                        <button type="button" onClick={onStartRecording} className={`${btnPrimary} hidden min-h-[58px] w-full sm:inline-flex sm:w-auto sm:min-w-[220px]`}>
                          Start recording
                        </button>
                        <button
                          type="button"
                          onClick={onFlipCamera}
                          className={`${btnGhost} hidden min-h-[50px] w-full sm:inline-flex sm:w-auto`}
                          disabled={!canSwitchCamera}
                        >
                          Switch camera
                        </button>
                        <button type="button" onClick={onCancelPreview} className={`${btnGhost} hidden min-h-[50px] w-full text-white/55 sm:inline-flex sm:w-auto`}>
                          Cancel
                        </button>
                      </>
                    )}
                    {recPhase === 'recording' && (
                      <>
                        {pauseSupported && (
                          <button type="button" onClick={onPause} className={`${btnGhost} hidden min-h-[52px] w-full sm:inline-flex sm:w-auto`}>
                            Pause
                          </button>
                        )}
                        <button type="button" onClick={onStop} className={`${btnSecondary} hidden min-h-[60px] w-full sm:inline-flex sm:w-auto sm:min-w-[220px]`}>
                          Stop
                        </button>
                      </>
                    )}
                    {recPhase === 'paused' && (
                      <>
                        <button type="button" onClick={onResume} className={`${btnPrimary} hidden min-h-[58px] w-full sm:inline-flex sm:w-auto sm:min-w-[220px]`}>
                          Resume
                        </button>
                        <button type="button" onClick={onStop} className={`${btnSecondary} hidden min-h-[54px] w-full sm:inline-flex sm:w-auto`}>
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </footer>
          </div>

          {recError && !boothReady && !showCurtain && (
            <p className="px-2 pt-1 text-center text-[13px] text-red-300/90 sm:text-[14px]">{recError.message}</p>
          )}
          {localError && (
            <div className="flex flex-col items-center gap-2 pt-1" role="alert">
              <p className="px-2 text-center text-[13px] text-red-300/90 sm:text-[14px]">{localError}</p>
              {!isRecording && (
                <button
                  type="button"
                  onClick={onRetryPreview}
                  className="min-h-[40px] rounded-[10px] border border-white/20 px-4 text-[13px] font-medium text-white/80 transition-colors [@media(hover:hover)]:hover:bg-white/5"
                >
                  Retry camera check
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
