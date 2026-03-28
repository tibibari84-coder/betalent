'use client';

import { useState, useEffect, useRef, type LegacyRef, type RefObject } from 'react';
import type { RecordingMode } from '@/constants/recording-modes';
import type {
  StudioCameraPermissionState,
  StudioPreviewFraming,
  StudioRecorderErrorCode,
  StudioRecorderPhase,
} from '@/hooks/useStudioRecorder';
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
import { btnGhost, btnPrimary, btnSecondary, studioIconBtn, studioPanel, studioRailBtn } from './studio-tokens';
import ViewfinderFrame from './ViewfinderFrame';

export type StudioBoothStepProps = {
  maxDurationSec: number;
  /** Front-camera mirror preview (iPhone-style); back camera stays natural. */
  mirrorPreview?: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  recPhase: StudioRecorderPhase;
  cameraPermissionState: StudioCameraPermissionState;
  /** True while getUserMedia / preview pipeline is in progress — hide false “permission denied” UI. */
  isAcquiringStream: boolean;
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
  onHardResetCamera: () => void;
  onSwitchToDeviceUpload: () => void;
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

function settingsHelpText(): string {
  if (typeof navigator === 'undefined') {
    return 'Open your device or browser settings and allow camera and microphone for this site, then tap Try again.';
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS: Settings → Privacy & Security → Camera and Microphone. If you use Safari, also check Settings → Apps → Safari → Camera / Microphone for this site.';
  }
  if (/Android/i.test(ua)) {
    return 'Android: Settings → Apps → your browser → Permissions — enable Camera and Microphone. On some devices, also check the site permission prompt in the address bar.';
  }
  return 'Desktop: click the lock or site icon in the address bar → Site settings → allow Camera and Microphone, then return here and tap Try again.';
}

type CameraAccessOverlayBlockProps = {
  title: string;
  detail: string;
  showSettingsHelp: boolean;
  onToggleSettingsHelp: () => void;
  onTryAgain: () => void;
  onHardReset: () => void;
  onUpload: () => void;
};

function CameraAccessOverlayBlock(props: CameraAccessOverlayBlockProps) {
  const {
    title,
    detail,
    showSettingsHelp,
    onToggleSettingsHelp,
    onTryAgain,
    onHardReset,
    onUpload,
  } = props;
  return (
    <div
      className="flex max-w-[min(100%,22rem)] flex-col items-center gap-4 rounded-2xl border border-white/[0.12] bg-black/88 px-5 py-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-xl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="studio-camera-access-title"
    >
      <h2 id="studio-camera-access-title" className="font-display text-lg font-bold tracking-tight text-white">
        {title}
      </h2>
      {detail ? (
        <p className="text-[13px] leading-relaxed text-white/62 sm:text-[14px]">{detail}</p>
      ) : null}
      <div className="flex w-full flex-col gap-2.5">
        <button type="button" onClick={onTryAgain} className={cn(btnPrimary, 'min-h-[48px] w-full justify-center')}>
          Try again
        </button>
        <button
          type="button"
          onClick={onToggleSettingsHelp}
          className={cn(btnSecondary, 'min-h-[48px] w-full justify-center')}
        >
          Open browser settings
        </button>
        {showSettingsHelp ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] leading-relaxed text-white/55">
            {settingsHelpText()}
          </p>
        ) : null}
        <button type="button" onClick={onHardReset} className={cn(btnGhost, 'min-h-[44px] w-full text-white/70')}>
          Reset camera
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="min-h-[44px] w-full text-[13px] font-medium text-white/45 underline decoration-white/25 underline-offset-4 [@media(hover:hover)]:hover:text-white/75"
        >
          Upload video from device
        </button>
      </div>
    </div>
  );
}

export default function StudioBoothStep(props: StudioBoothStepProps) {
  const {
    maxDurationSec,
    mirrorPreview = false,
    videoRef,
    recPhase,
    cameraPermissionState,
    isAcquiringStream,
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
    onHardResetCamera,
    onSwitchToDeviceUpload,
    onStartRecording,
    onFlipCamera,
    onPause,
    onResume,
    onStop,
  } = props;

  const [narrow, setNarrow] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [effectIdx, setEffectIdx] = useState(0);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);
  const swipeFrom = useRef<{ x: number; y: number; fromTop: boolean } | null>(null);

  const durationChips = [...DURATION_PRESETS.filter((s) => s <= maxDurationSec)];
  if (!durationChips.includes(maxDurationSec)) durationChips.push(maxDurationSec);
  durationChips.sort((a, b) => a - b);

  const onImmersiveTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeFrom.current = {
      x: t.clientX,
      y: t.clientY,
      fromTop: t.clientY < window.innerHeight * 0.22,
    };
  };

  const onImmersiveTouchEnd = (e: React.TouchEvent) => {
    const s = swipeFrom.current;
    swipeFrom.current = null;
    if (!s?.fromTop) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - s.y;
    const dx = Math.abs(t.clientX - s.x);
    if (dy > 96 && dy > dx * 1.25) onCancelPreview();
  };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const isPreview =
    boothReady && recPhase === 'preview' && cameraPermissionState === 'granted';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const canSwitchCamera = isPreview && !switchingLens;

  const accessMessage = (localError || recError?.message || '').trim();
  const terminalCameraFailure =
    cameraPermissionState === 'denied' || cameraPermissionState === 'error';
  const showCameraAccessOverlay =
    !showCurtain &&
    !boothReady &&
    !isRecording &&
    !isAcquiringStream &&
    cameraPermissionState !== 'requesting' &&
    terminalCameraFailure;
  const showRequestingBanner =
    !showCurtain &&
    !boothReady &&
    !isRecording &&
    (isAcquiringStream || cameraPermissionState === 'requesting');
  const showStatusOverlay = isPreview || isRecording;

  useEffect(() => {
    if (!showCameraAccessOverlay) setShowSettingsHelp(false);
  }, [showCameraAccessOverlay]);

  const cameraAccessTitle =
    cameraPermissionState === 'denied' || recError?.code === 'permission_denied'
      ? 'Camera access required'
      : 'Camera unavailable';

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
          <div className={cn('flex h-full w-full flex-col overflow-hidden', narrow && 'relative')}>
            {!narrow && (
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

            {narrow ? (
              <div
                className="relative min-h-0 flex-1 touch-manipulation"
                onTouchStart={onImmersiveTouchStart}
                onTouchEnd={onImmersiveTouchEnd}
              >
                <div className="absolute inset-0 z-0 bg-black">
                  <video
                    ref={videoRef as LegacyRef<HTMLVideoElement>}
                    className={cn(
                      'h-full w-full bg-black object-cover',
                      mirrorPreview && '-scale-x-100'
                    )}
                    style={{ objectPosition: videoObjectPosition }}
                    playsInline
                    muted
                  />
                  {showGrid ? (
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
                        'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 20%, transparent 45%, transparent 62%, rgba(0,0,0,0.5) 100%)',
                    }}
                    aria-hidden
                  />
                </div>

                <header
                  className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-3 pb-14 pt-[max(10px,env(safe-area-inset-top))]"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, transparent 100%)' }}
                >
                  <button
                    type="button"
                    onClick={onCancelPreview}
                    className={cn(studioIconBtn, 'h-11 w-11')}
                    aria-label="Close studio"
                  >
                    <IconX className="!h-5 !w-5" />
                  </button>
                  <span className="text-[13px] font-semibold tracking-wide text-white/88">
                    {isRecording ? 'Recording' : isPreview ? 'Preview' : 'Create'}
                  </span>
                  <div className="flex w-[88px] shrink-0 justify-end gap-2">
                    {isPreview ? (
                      <button
                        type="button"
                        onClick={() => void onFlipCamera()}
                        disabled={!canSwitchCamera}
                        className={cn(studioIconBtn, 'h-11 w-11')}
                        aria-label="Flip camera"
                      >
                        <IconArrowPath className="!h-5 !w-5" />
                      </button>
                    ) : (
                      <span className="h-11 w-11 shrink-0" aria-hidden />
                    )}
                    {!narrow ? (
                      <button
                        type="button"
                        disabled
                        className={cn(studioIconBtn, 'h-11 w-11 opacity-40')}
                        aria-label="Settings (soon)"
                        title="Soon"
                      >
                        <IconSettings className="!h-5 !w-5" />
                      </button>
                    ) : (
                      <span className="h-11 w-11 shrink-0" aria-hidden />
                    )}
                  </div>
                </header>

                {showStatusOverlay ? (
                  <div className="pointer-events-none absolute left-3 right-[4.75rem] top-[calc(3.5rem+env(safe-area-inset-top))] z-[45] flex items-start justify-between gap-2">
                    <div
                      className="rounded-full px-3 py-1.5 font-mono text-[11px] tabular-nums text-white/95"
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
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
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
                ) : null}

                {!narrow ? (
                  <div className="absolute bottom-[28%] right-3 z-40 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setEffectsOpen((o) => !o)}
                      className={cn(studioRailBtn, effectsOpen && 'border-accent/45 text-accent')}
                      aria-label="Effects"
                      aria-pressed={effectsOpen}
                    >
                      <IconSparkles className="!h-6 !w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGrid((v) => !v)}
                      className={cn(studioRailBtn, showGrid && 'border-accent/45 text-accent')}
                      aria-label="Filters and grid"
                      aria-pressed={showGrid}
                    >
                      <IconLayoutGrid className="!h-6 !w-6" />
                    </button>
                    <button type="button" disabled className={studioRailBtn} aria-label="Timer" title="Coming soon">
                      <IconClock className="!h-6 !w-6 opacity-45" />
                    </button>
                    <button type="button" disabled className={studioRailBtn} aria-label="Flash" title="Coming soon">
                      <IconBolt className="!h-6 !w-6 opacity-45" />
                    </button>
                    <button type="button" disabled className={studioRailBtn} aria-label="Speed" title="Coming soon">
                      <span className="text-[12px] font-bold tabular-nums text-white/50">1×</span>
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-[26%] right-3 z-40 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGrid((v) => !v)}
                      className={cn(studioRailBtn, 'h-11 w-11', showGrid && 'border-accent/45 text-accent')}
                      aria-label="Grid"
                      aria-pressed={showGrid}
                    >
                      <IconLayoutGrid className="!h-5 !w-5" />
                    </button>
                  </div>
                )}

                {switchingLens && boothReady ? (
                  <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm">
                    <p className="text-[13px] font-medium text-white/85">Switching camera…</p>
                  </div>
                ) : null}

                {showCameraAccessOverlay ? (
                  <div className="absolute inset-0 z-[46] flex items-center justify-center bg-black/78 px-4 backdrop-blur-sm">
                    <CameraAccessOverlayBlock
                      title={cameraAccessTitle}
                      detail={accessMessage}
                      showSettingsHelp={showSettingsHelp}
                      onToggleSettingsHelp={() => setShowSettingsHelp((v) => !v)}
                      onTryAgain={() => {
                        setShowSettingsHelp(false);
                        onRetryPreview();
                      }}
                      onHardReset={() => {
                        setShowSettingsHelp(false);
                        void onHardResetCamera();
                      }}
                      onUpload={() => {
                        setShowSettingsHelp(false);
                        onSwitchToDeviceUpload();
                      }}
                    />
                  </div>
                ) : null}
                {showRequestingBanner ? (
                  <div className="pointer-events-none absolute left-3 right-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-[46] flex justify-center">
                    <div
                      className="rounded-full border border-white/[0.12] bg-black/75 px-4 py-2 text-[12px] font-medium text-white/80 backdrop-blur-md"
                      role="status"
                      aria-live="polite"
                    >
                      Requesting camera access…
                    </div>
                  </div>
                ) : null}

                <div
                  className="absolute inset-x-0 bottom-0 z-50 flex flex-col pt-8 pb-[max(12px,env(safe-area-inset-bottom))]"
                  style={{
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.45) 50%, transparent 100%)',
                  }}
                >
                  {isRecording ? (
                    <div className="mb-2 px-4">
                      <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/12">
                        <div
                          className="h-full rounded-full bg-accent/95 transition-[width] duration-200 ease-out"
                          style={{
                            width: `${Math.min(100, (recElapsedSec / Math.max(1, maxDurationSec)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {!narrow && effectsOpen ? (
                    <div className="mb-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {EFFECT_STRIP.map((e, i) => (
                        <button
                          key={e.id + i}
                          type="button"
                          disabled={i > 2}
                          onClick={() => i <= 2 && setEffectIdx(i)}
                          className={cn(
                            'flex snap-center shrink-0 flex-col items-center gap-1.5 disabled:opacity-40',
                            i > 2 && 'pointer-events-none'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-full border text-[10px] font-medium transition-colors',
                              effectIdx === i && i <= 2
                                ? 'border-accent/50 bg-accent/15 text-white'
                                : 'border-white/[0.12] bg-black/50 text-white/50'
                            )}
                          >
                            {e.label.slice(0, 2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!narrow ? (
                    <div className="mb-3 flex snap-x snap-mandatory justify-start gap-3 overflow-x-auto px-4 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {durationChips.map((sec) => {
                        const active = sec === maxDurationSec;
                        const label = sec >= 600 ? `${Math.round(sec / 60)}m` : `${sec}s`;
                        return (
                          <span
                            key={sec}
                            className={cn(
                              'snap-center shrink-0 rounded-full px-3 py-2 text-[13px] font-semibold tabular-nums',
                              active ? 'bg-white/[0.14] text-white' : 'text-white/35'
                            )}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-center gap-6 px-4">
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
                      <button
                        type="button"
                        onClick={onPause}
                        className={cn(studioIconBtn, 'h-12 w-12 border-white/10')}
                        aria-label="Pause recording"
                      >
                        <span className="flex gap-0.5" aria-hidden>
                          <span className="h-4 w-1 rounded-sm bg-white/90" />
                          <span className="h-4 w-1 rounded-sm bg-white/90" />
                        </span>
                      </button>
                    ) : recPhase === 'paused' ? (
                      <button
                        type="button"
                        onClick={onStop}
                        className={cn(studioIconBtn, 'h-12 w-12 border-white/10')}
                        aria-label="Stop recording"
                      >
                        <span className="h-3.5 w-3.5 rounded-sm bg-white/90" aria-hidden />
                      </button>
                    ) : (
                      <div className="h-12 w-12 shrink-0" aria-hidden />
                    )}
                    <div className="flex shrink-0 justify-center">{recordPrimary}</div>
                    <div className="h-12 w-12 shrink-0" aria-hidden />
                  </div>
                  {!narrow ? (
                    <p className="mt-1 px-2 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/25">
                      Looks are preview-only · max {maxDurationSec}s
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <section className="relative flex min-h-0 flex-1 flex-col md:items-center md:justify-center md:py-4">
                  {showRequestingBanner ? (
                    <div className="mb-3 flex w-full shrink-0 justify-center px-4">
                      <div
                        className="rounded-full border border-white/[0.12] bg-black/75 px-4 py-2 text-[12px] font-medium text-white/80 backdrop-blur-md"
                        role="status"
                        aria-live="polite"
                      >
                        Requesting camera access…
                      </div>
                    </div>
                  ) : null}
                  <div className="mx-auto w-full max-w-[560px]">
                    <ViewfinderFrame corners>
                      <div
                        className="relative aspect-[9/16] overflow-hidden rounded-[24px] bg-black shadow-[0_0_0_1px_rgba(196,18,47,0.14),0_40px_110px_rgba(0,0,0,0.9),0_0_140px_rgba(196,18,47,0.06)] ring-1 ring-white/12 md:aspect-[9/16]"
                        style={{ height: 'min(68dvh, 780px)', aspectRatio: previewFraming.stageAspect }}
                      >
                        <video
                          ref={videoRef as LegacyRef<HTMLVideoElement>}
                          className={cn(
                            'absolute inset-0 h-full w-full bg-black',
                            mirrorPreview && '-scale-x-100'
                          )}
                          style={{ objectFit: previewFraming.fit, objectPosition: previewFraming.objectPosition }}
                          playsInline
                          muted
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[10]"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 22%, rgba(0,0,0,0.03) 58%, rgba(0,0,0,0.48) 100%)',
                          }}
                          aria-hidden
                        />
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

                        {showCameraAccessOverlay ? (
                          <div className="absolute inset-0 z-[28] flex items-center justify-center bg-black/78 px-3 backdrop-blur-sm">
                            <CameraAccessOverlayBlock
                              title={cameraAccessTitle}
                              detail={accessMessage}
                              showSettingsHelp={showSettingsHelp}
                              onToggleSettingsHelp={() => setShowSettingsHelp((v) => !v)}
                              onTryAgain={() => {
                                setShowSettingsHelp(false);
                                onRetryPreview();
                              }}
                              onHardReset={() => {
                                setShowSettingsHelp(false);
                                void onHardResetCamera();
                              }}
                              onUpload={() => {
                                setShowSettingsHelp(false);
                                onSwitchToDeviceUpload();
                              }}
                            />
                          </div>
                        ) : null}
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
                </footer>
              </>
            )}
          </div>

          {!showCameraAccessOverlay &&
            (localError || recError) &&
            !isRecording &&
            !isAcquiringStream &&
            cameraPermissionState !== 'requesting' && (
            <div className="flex flex-col items-center gap-2 pt-1" role="alert">
              <p className="px-2 text-center text-[13px] text-red-300/90 sm:text-[14px]">
                {localError || recError?.message}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onRetryPreview}
                  className="min-h-[40px] rounded-[10px] border border-white/20 px-4 text-[13px] font-medium text-white/80 transition-colors [@media(hover:hover)]:hover:bg-white/5"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => void onHardResetCamera()}
                  className="min-h-[40px] rounded-[10px] border border-white/20 px-4 text-[13px] font-medium text-white/80 transition-colors [@media(hover:hover)]:hover:bg-white/5"
                >
                  Reset camera
                </button>
                <button
                  type="button"
                  onClick={onSwitchToDeviceUpload}
                  className="min-h-[40px] px-3 text-[13px] font-medium text-white/45 underline decoration-white/25 underline-offset-4"
                >
                  Upload from device
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
