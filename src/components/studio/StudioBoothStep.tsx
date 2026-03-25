'use client';

import type { LegacyRef, RefObject } from 'react';
import type { RecordingMode } from '@/constants/recording-modes';
import type { StudioRecorderErrorCode, StudioRecorderPhase } from '@/hooks/useStudioRecorder';
import { btnGhost, btnPrimary, btnSecondary, studioPanel } from './studio-tokens';
import ViewfinderFrame from './ViewfinderFrame';
import { getStudioModeCopy } from './studio-mode-copy';

export type StudioBoothStepProps = {
  maxDurationSec: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  recPhase: StudioRecorderPhase;
  recElapsedSec: number;
  recError: { code: StudioRecorderErrorCode; message: string } | null;
  micLive: boolean;
  pauseSupported: boolean;
  mode: RecordingMode;
  /** House lights: fade + “Preparing camera…” while getUserMedia runs */
  showCurtain: boolean;
  /** Brief overlay while switching front/back camera */
  switchingLens: boolean;
  boothReady: boolean;
  localError: string;
  onCancelDuringCurtain: () => void;
  /** Exit live room from preview (before record) */
  onCancelPreview: () => void;
  onRetryPreview: () => void;
  onStartRecording: () => void;
  onFlipCamera: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export default function StudioBoothStep(props: StudioBoothStepProps) {
  const {
    maxDurationSec,
    videoRef,
    recPhase,
    recElapsedSec,
    recError,
    micLive,
    pauseSupported,
    mode,
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
  const copy = getStudioModeCopy(mode);

  const isPreview = boothReady && recPhase === 'preview';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';

  return (
    <>
      {/* Stepping on stage — full-viewport curtain while permissions resolve */}
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
            className="absolute inset-0 pointer-events-none opacity-30 animate-studio-breathe"
            style={{
              background: 'radial-gradient(circle at 50% 45%, rgba(196,18,47,0.25) 0%, transparent 42%)',
            }}
            aria-hidden
          />
          <div className="relative z-[1] text-center max-w-[20rem] space-y-4">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-accent/90 font-semibold">House lights</p>
            <h2 className="font-display text-[1.5rem] sm:text-[1.75rem] font-bold text-white tracking-tight">Preparing camera…</h2>
            <p className="text-[13px] sm:text-[14px] text-white/55 leading-relaxed">
              We need your camera and microphone. When your browser asks, choose <strong className="text-white/80">Allow</strong> so you can step into the live room.
            </p>
            <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
            <button
              type="button"
              onClick={onCancelDuringCurtain}
              className="text-[13px] font-medium text-white/45 hover:text-white/80 underline underline-offset-4 decoration-white/20 min-h-[44px] px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className={`${studioPanel} animate-studio-enter ${showCurtain ? 'opacity-40 pointer-events-none' : ''} transition-opacity duration-300`}
        style={{ minHeight: 'calc(100svh - 110px)' }}
      >
        <div
          className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6"
          style={{
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {mode === 'live' && copy.liveChallengeBadge && (
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full border border-accent/40 bg-accent/12 text-accent">
                    {copy.liveChallengeBadge}
                  </span>
                )}
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-accent/90 font-semibold">
                  {isRecording ? 'Recording' : isPreview ? 'Live preview' : copy.boothLabel}
                </span>
                <span className="text-white/20 text-[10px] hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/38 font-medium">9:16 stage</span>
              </div>
              <p className="text-[13px] sm:text-[14px] text-white/48 leading-snug max-w-[22rem]">
                {isRecording ? (
                  <>
                    Max <span className="text-white/70 tabular-nums">{maxDurationSec}s</span> · end with Stop when you’re done
                  </>
                ) : isPreview ? (
                    <>{copy.boothDescription}</>
                ) : (
                  <>Opening inputs…</>
                )}
              </p>
            </div>
          </div>

          <ViewfinderFrame>
            <div
              className="relative rounded-[20px] sm:rounded-[22px] overflow-hidden ring-1 ring-white/10 bg-black aspect-[9/16] shadow-[0_0_0_1px_rgba(196,18,47,0.12),0_28px_90px_rgba(0,0,0,0.85),0_0_120px_rgba(196,18,47,0.08)]"
              style={{ minHeight: 'min(56svh, 620px)', maxHeight: 'min(64svh, 700px)' }}
            >
              <video
                ref={videoRef as LegacyRef<HTMLVideoElement>}
                className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01]"
                playsInline
                muted
              />
              <div
                className="pointer-events-none absolute inset-0 z-[12] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_42%,rgba(0,0,0,0.45)_100%)]"
                aria-hidden
              />
              <div className="pointer-events-none absolute bottom-14 left-0 right-0 z-[14] flex justify-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-medium px-3 py-1 rounded-full bg-black/35 backdrop-blur-sm border border-white/[0.08]">
                  Safe title · keep eyes upper third
                </span>
              </div>

              {switchingLens && boothReady && (
                <div className="absolute inset-0 z-[22] flex items-center justify-center bg-black/75 backdrop-blur-sm">
                  <p className="text-[13px] text-white/80 font-medium">Switching camera…</p>
                </div>
              )}

              {/* Preview: mic status */}
              {isPreview && !switchingLens && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[30] pointer-events-none flex flex-col items-end gap-2">
                  <div
                    className="flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em]"
                    style={{
                      background: micLive ? 'rgba(6,24,14,0.88)' : 'rgba(24,12,6,0.88)',
                      border: micLive ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(251,191,36,0.35)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${micLive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`}
                      aria-hidden
                    />
                    {micLive ? 'Mic live' : 'Mic…'}
                  </div>
                </div>
              )}

            {/* Timer is always visible in booth; REC badge appears only while recording. */}
              {(isPreview || isRecording) && (
                <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start z-[30] pointer-events-none gap-2">
                  <div
                    className="rounded-full px-3 py-2 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-mono font-medium tabular-nums tracking-wide text-white/95"
                    style={{
                      background: 'linear-gradient(180deg, rgba(12,12,14,0.82) 0%, rgba(6,6,8,0.88) 100%)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <span className="text-white/40 mr-1.5">TC</span>
                    {String(Math.floor(recElapsedSec / 60)).padStart(2, '0')}:{String(recElapsedSec % 60).padStart(2, '0')}
                    <span className="text-white/35 mx-1.5">/</span>
                    <span className="text-white/55">{maxDurationSec}s</span>
                  </div>
                  {recPhase === 'recording' && (
                    <div
                      className="flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-white"
                      style={{
                        background: 'rgba(12,6,8,0.92)',
                        border: '1px solid rgba(196,18,47,0.5)',
                        boxShadow: '0 0 32px rgba(196,18,47,0.3)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(196,18,47,0.85)] animate-studio-pulse-dot" />
                      REC
                    </div>
                  )}
                  {recPhase === 'paused' && (
                    <div className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/40 text-amber-100">
                      Paused
                    </div>
                  )}
                </div>
              )}
            </div>
          </ViewfinderFrame>

          {recError && !boothReady && !showCurtain && (
            <p className="text-[13px] sm:text-[14px] text-center text-red-300/90 px-2">{recError.message}</p>
          )}
          {localError && (
            <div className="flex flex-col items-center gap-2" role="alert">
              <p className="text-[13px] sm:text-[14px] text-center text-red-300/90 px-2">{localError}</p>
              {!isRecording && (
                <button
                  type="button"
                  onClick={onRetryPreview}
                  className="text-[13px] font-medium text-white/80 border border-white/20 rounded-[10px] px-4 min-h-[40px] [@media(hover:hover)]:hover:bg-white/5 transition-colors"
                >
                  Retry camera check
                </button>
              )}
            </div>
          )}

          <div
            className="mx-auto w-full max-w-xl rounded-[18px] border border-white/[0.1] p-3.5 sm:p-5 space-y-3 sm:space-y-4"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">
              {isRecording ? 'Recording' : isPreview ? 'Controls' : '—'}
            </p>
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3">
              {isPreview && !switchingLens && (
                <>
                  <button
                    type="button"
                    onClick={onStartRecording}
                    className={`${btnPrimary} min-h-[60px] px-8 sm:px-10 w-full sm:w-auto sm:min-w-[220px]`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/95 shadow-[0_0_8px_rgba(255,255,255,0.7)]" aria-hidden />
                      Start recording
                    </span>
                  </button>
                  <button type="button" onClick={onFlipCamera} className={`${btnGhost} min-h-[54px] w-full sm:w-auto sm:order-1`}>
                    Switch camera
                  </button>
                  <button type="button" onClick={onCancelPreview} className={`${btnGhost} min-h-[54px] w-full sm:w-auto sm:order-3 text-white/50`}>
                    Cancel
                  </button>
                </>
              )}
              {recPhase === 'recording' && (
                <>
                  {pauseSupported && (
                    <button type="button" onClick={onPause} className={`${btnGhost} min-h-[54px] w-full sm:w-auto`}>
                      Pause
                    </button>
                  )}
                  <button type="button" onClick={onStop} className={`${btnSecondary} min-h-[58px] px-10 w-full sm:w-auto sm:min-w-[220px]`}>
                    Stop
                  </button>
                </>
              )}
              {recPhase === 'paused' && (
                <>
                  <button type="button" onClick={onResume} className={`${btnPrimary} min-h-[58px] px-8 w-full sm:w-auto sm:min-w-[220px]`}>
                    Resume
                  </button>
                  <button type="button" onClick={onStop} className={`${btnSecondary} min-h-[54px] px-8 w-full sm:w-auto`}>
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
