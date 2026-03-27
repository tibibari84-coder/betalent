'use client';

import type { LegacyRef, RefObject } from 'react';
import type { RecordingMode } from '@/constants/recording-modes';
import type { StudioPreviewFraming, StudioRecorderErrorCode, StudioRecorderPhase } from '@/hooks/useStudioRecorder';
import { btnGhost, btnPrimary, btnSecondary, studioPanel } from './studio-tokens';
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
  const isPreview = boothReady && recPhase === 'preview';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const canSwitchCamera = isPreview && !switchingLens;
  const showStatusOverlay = isPreview || isRecording;

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
        className={`fixed inset-0 z-[120] ${studioPanel} animate-studio-enter ${showCurtain ? 'opacity-40 pointer-events-none' : ''} transition-opacity duration-300`}
        style={{ minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        <div
          className="h-full overflow-hidden px-3 sm:px-6 md:px-8"
          style={{
            paddingTop: 'max(8px, env(safe-area-inset-top))',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="h-full w-full flex flex-col overflow-hidden">
            <header className="shrink-0 pt-0.5 pb-2">
              <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-xl px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/42 font-semibold">BETALENT Studio</p>
                    <p className="text-[12px] sm:text-[13px] text-white/82 truncate">
                      {isRecording ? 'Recording take' : isPreview ? 'Creator preview' : 'Preparing inputs'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-accent/90 font-semibold">9:16</p>
                    <p className="text-[10px] text-white/45 tabular-nums">max {maxDurationSec}s</p>
                  </div>
                </div>
              </div>
            </header>

            <section className="flex-1 min-h-0 flex items-center justify-center py-2 sm:py-4">
              <div className="w-full max-w-[560px]">
                <ViewfinderFrame>
                  <div
                    className="relative rounded-[24px] overflow-hidden ring-1 ring-white/12 bg-black aspect-[9/16] shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9),0_0_140px_rgba(196,18,47,0.06)]"
                    style={{ height: 'min(68dvh, 780px)', aspectRatio: previewFraming.stageAspect }}
                  >
                    <video
                      ref={videoRef as LegacyRef<HTMLVideoElement>}
                      className="absolute inset-0 h-full w-full bg-black"
                      style={{ objectFit: previewFraming.fit, objectPosition: previewFraming.objectPosition }}
                      playsInline
                      muted
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-[10]"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.42) 100%)',
                      }}
                      aria-hidden
                    />

                    {showStatusOverlay && (
                      <div className="absolute inset-x-2 top-2 sm:inset-x-3 sm:top-3 z-[20] flex items-start justify-between gap-2 pointer-events-none">
                        <div
                          className="rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-mono tabular-nums text-white/95"
                          style={{
                            background: 'rgba(8,8,10,0.7)',
                            border: '1px solid rgba(255,255,255,0.16)',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <span className="text-white/45 mr-1.5">TC</span>
                          {String(Math.floor(recElapsedSec / 60)).padStart(2, '0')}:{String(recElapsedSec % 60).padStart(2, '0')}
                          <span className="text-white/30 mx-1.5">/</span>
                          <span className="text-white/55">{maxDurationSec}s</span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <div
                            className="rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-semibold"
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
                              className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-bold text-white"
                              style={{
                                background: 'rgba(24,5,10,0.88)',
                                border: '1px solid rgba(196,18,47,0.6)',
                                boxShadow: '0 0 26px rgba(196,18,47,0.32)',
                              }}
                            >
                              REC
                            </div>
                          )}
                          {recPhase === 'paused' && (
                            <div className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-100">
                              Paused
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pointer-events-none absolute bottom-7 left-0 right-0 z-[20] flex justify-center">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium px-3 py-1 rounded-full bg-black/35 border border-white/[0.09] backdrop-blur-sm">
                        Keep eyes near upper third
                      </span>
                    </div>

                    {switchingLens && boothReady && (
                      <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/72 backdrop-blur-sm">
                        <p className="text-[13px] text-white/85 font-medium">Switching camera…</p>
                      </div>
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
                <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/36 font-semibold mb-2.5">
                  {isRecording ? 'Recording controls' : isPreview ? 'Preview controls' : 'Studio controls'}
                </p>

                <div className="sm:hidden flex items-center justify-between gap-3 mb-2">
                  <button type="button" onClick={onCancelPreview} className={`${btnGhost} min-h-[48px] min-w-[72px] px-3 text-white/60`}>
                    Back
                  </button>
                  {isPreview && !switchingLens && (
                    <button
                      type="button"
                      onClick={onStartRecording}
                      className="relative h-[78px] w-[78px] rounded-full border border-white/25 bg-white/10 backdrop-blur-md flex items-center justify-center"
                      aria-label="Start recording"
                    >
                      <span className="h-[58px] w-[58px] rounded-full bg-accent shadow-[0_0_26px_rgba(196,18,47,0.55)]" />
                    </button>
                  )}
                  {recPhase === 'recording' && (
                    <button
                      type="button"
                      onClick={onStop}
                      className="relative h-[78px] w-[78px] rounded-full border border-white/25 bg-white/10 backdrop-blur-md flex items-center justify-center"
                      aria-label="Stop recording"
                    >
                      <span className="h-[34px] w-[34px] rounded-[10px] bg-white shadow-[0_0_18px_rgba(255,255,255,0.35)]" />
                    </button>
                  )}
                  {recPhase === 'paused' && (
                    <button
                      type="button"
                      onClick={onResume}
                      className="relative h-[78px] w-[78px] rounded-full border border-white/25 bg-white/10 backdrop-blur-md flex items-center justify-center"
                      aria-label="Resume recording"
                    >
                      <span className="h-[58px] w-[58px] rounded-full bg-accent shadow-[0_0_26px_rgba(196,18,47,0.55)]" />
                    </button>
                  )}
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
                      <button
                        type="button"
                        onClick={onStartRecording}
                        className={`${btnPrimary} hidden sm:inline-flex min-h-[58px] w-full sm:w-auto sm:min-w-[220px]`}
                      >
                        Start recording
                      </button>
                      <button
                        type="button"
                        onClick={onFlipCamera}
                        className={`${btnGhost} hidden sm:inline-flex min-h-[50px] w-full sm:w-auto`}
                        disabled={!canSwitchCamera}
                      >
                        Switch camera
                      </button>
                      <button type="button" onClick={onCancelPreview} className={`${btnGhost} hidden sm:inline-flex min-h-[50px] w-full sm:w-auto text-white/55`}>
                        Cancel
                      </button>
                    </>
                  )}

                  {recPhase === 'recording' && (
                    <>
                      {pauseSupported && (
                        <button type="button" onClick={onPause} className={`${btnGhost} hidden sm:inline-flex min-h-[52px] w-full sm:w-auto`}>
                          Pause
                        </button>
                      )}
                      <button type="button" onClick={onStop} className={`${btnSecondary} hidden sm:inline-flex min-h-[60px] w-full sm:w-auto sm:min-w-[220px]`}>
                        Stop
                      </button>
                    </>
                  )}

                  {recPhase === 'paused' && (
                    <>
                      <button type="button" onClick={onResume} className={`${btnPrimary} hidden sm:inline-flex min-h-[58px] w-full sm:w-auto sm:min-w-[220px]`}>
                        Resume
                      </button>
                      <button type="button" onClick={onStop} className={`${btnSecondary} hidden sm:inline-flex min-h-[54px] w-full sm:w-auto`}>
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            </footer>
          </div>

          {recError && !boothReady && !showCurtain && (
            <p className="text-[13px] sm:text-[14px] text-center text-red-300/90 px-2 pt-1">{recError.message}</p>
          )}
          {localError && (
            <div className="flex flex-col items-center gap-2 pt-1" role="alert">
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
        </div>
      </div>
    </>
  );
}
