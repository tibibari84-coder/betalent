'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type {
  StudioCameraPermissionState,
  StudioRecorderErrorCode,
  StudioRecorderPhase,
} from '@/lib/studio/studio-recorder-types';
import { cn } from '@/lib/utils';
import CameraPreview from '@/components/studio/CameraPreview';
import StudioTopBar from '@/components/studio/StudioTopBar';
import StudioSideControls from '@/components/studio/StudioSideControls';
import StudioModeSelector from '@/components/studio/StudioModeSelector';
import StudioRecordControls from '@/components/studio/StudioRecordControls';
import { btnGhost, btnPrimary, btnSecondary } from './studio-tokens';

export type StudioCameraScreenProps = {
  platformMaxDurationSec: number;
  recordingCapSec: number;
  onRecordingCapChange: (sec: number) => void;
  mirrorPreview?: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  recPhase: StudioRecorderPhase;
  cameraPermissionState: StudioCameraPermissionState;
  isAcquiringStream: boolean;
  recElapsedSec: number;
  recElapsedMs: number;
  recError: { code: StudioRecorderErrorCode; message: string } | null;
  micLive: boolean;
  showCurtain: boolean;
  switchingLens: boolean;
  boothReady: boolean;
  localError: string;
  onCancelDuringCurtain: () => void;
  onCancelPreview: () => void;
  onRetryPreview: () => void;
  onHardResetCamera: () => void;
  onStartRecording: () => void;
  onFlipCamera: () => void;
  onStop: () => void;
};

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
};

function CameraAccessOverlayBlock(props: CameraAccessOverlayBlockProps) {
  const {
    title,
    detail,
    showSettingsHelp,
    onToggleSettingsHelp,
    onTryAgain,
    onHardReset,
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
        <button
          type="button"
          onClick={onTryAgain}
          className={cn(btnPrimary, 'min-h-[48px] w-full touch-manipulation justify-center')}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onToggleSettingsHelp}
          className={cn(btnSecondary, 'min-h-[48px] w-full touch-manipulation justify-center')}
        >
          Open browser settings
        </button>
        {showSettingsHelp ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] leading-relaxed text-white/55">
            {settingsHelpText()}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onHardReset}
          className={cn(btnGhost, 'min-h-[44px] w-full touch-manipulation text-white/70')}
        >
          Reset camera
        </button>
      </div>
    </div>
  );
}

export default function StudioCameraScreen(props: StudioCameraScreenProps) {
  const {
    platformMaxDurationSec,
    recordingCapSec,
    onRecordingCapChange,
    mirrorPreview = false,
    videoRef,
    recPhase,
    cameraPermissionState,
    isAcquiringStream,
    recElapsedSec,
    recElapsedMs,
    recError,
    micLive,
    showCurtain,
    switchingLens,
    boothReady,
    localError,
    onCancelDuringCurtain,
    onCancelPreview,
    onRetryPreview,
    onHardResetCamera,
    onStartRecording,
    onFlipCamera,
    onStop,
  } = props;

  const [showSettingsHelp, setShowSettingsHelp] = useState(false);
  const swipeFrom = useRef<{ x: number; y: number; fromTop: boolean } | null>(null);

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

  const isPreview =
    boothReady && recPhase === 'preview' && cameraPermissionState === 'granted';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const modeSelectorDisabled = recPhase === 'recording' || recPhase === 'paused';
  const canSwitchCamera = isPreview && !switchingLens;
  const recordingProgress =
    recPhase === 'recording' || recPhase === 'paused'
      ? Math.min(1, recElapsedMs / Math.max(1, recordingCapSec * 1000))
      : 0;

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

  useEffect(() => {
    if (!showCameraAccessOverlay) setShowSettingsHelp(false);
  }, [showCameraAccessOverlay]);

  const cameraAccessTitle =
    recError?.code === 'microphone_permission_denied'
      ? 'Microphone access required'
      : cameraPermissionState === 'denied' || recError?.code === 'permission_denied'
        ? 'Camera access required'
        : 'Camera unavailable';

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
              We need your camera and microphone. When your browser asks, choose{' '}
              <strong className="text-white/80">Allow</strong> so you can step into the live room.
            </p>
            <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
            <button
              type="button"
              onClick={onCancelDuringCurtain}
              className="min-h-[44px] touch-manipulation px-4 text-[13px] font-medium text-white/45 underline decoration-white/20 underline-offset-4 hover:text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'fixed inset-0 z-[120] h-screen w-full animate-studio-enter overflow-hidden bg-black transition-opacity duration-300',
          showCurtain && 'pointer-events-none opacity-40'
        )}
        style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
      >
        <div
          className="relative m-0 h-full w-full max-w-[100vw] overflow-hidden bg-black p-0 touch-manipulation"
          onTouchStart={onImmersiveTouchStart}
          onTouchEnd={onImmersiveTouchEnd}
        >
          {isRecording ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[135] pt-[env(safe-area-inset-top)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(recordingProgress * 100)}
              aria-label="Recording progress"
            >
              <div className="h-[3px] w-full bg-white/12">
                <div
                  className="h-full bg-accent shadow-[0_0_12px_rgba(196,18,47,0.45)] transition-[width] duration-150"
                  style={{ width: `${recordingProgress * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="absolute inset-0 z-0">
            <CameraPreview videoRef={videoRef} mirror={mirrorPreview} />
            <div
              className="pointer-events-none absolute inset-0 z-[10]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.06) 18%, transparent 42%, transparent 58%, rgba(0,0,0,0.55) 100%)',
              }}
              aria-hidden
            />
          </div>

          <StudioTopBar onClose={onCancelPreview} />

          {isPreview || isRecording ? (
            <div className="pointer-events-none absolute left-3 right-[4.75rem] top-[calc(3.5rem+env(safe-area-inset-top))] z-[25] flex items-start justify-between gap-2">
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
                <span className="text-white/55">{recordingCapSec}s</span>
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
                    className="rounded-full border border-red-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                    style={{
                      background: 'rgba(24,5,10,0.88)',
                      boxShadow: '0 0 22px rgba(196,18,47,0.28)',
                    }}
                  >
                    REC
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <StudioSideControls canFlip={canSwitchCamera} onFlip={onFlipCamera} />

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

          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            {!showCurtain && recPhase !== 'recording' && recPhase !== 'paused' ? (
              <StudioModeSelector
                platformMaxSec={platformMaxDurationSec}
                value={recordingCapSec}
                onChange={onRecordingCapChange}
                disabled={modeSelectorDisabled}
                className="relative z-[1]"
              />
            ) : null}
            <div className="relative z-[1] mt-1 flex w-full max-w-md items-end justify-center px-5">
              <StudioRecordControls
                recPhase={recPhase}
                maxDurationSec={recordingCapSec}
                elapsedMs={recElapsedMs}
                switchingLens={switchingLens}
                onStart={onStartRecording}
                onStop={() => void onStop()}
              />
            </div>
          </div>

          {!showCameraAccessOverlay &&
            (localError || recError) &&
            !isRecording &&
            !isAcquiringStream &&
            cameraPermissionState !== 'requesting' && (
              <div
                className="absolute bottom-[max(120px,env(safe-area-inset-bottom))] left-0 right-0 z-[35] flex flex-col items-center gap-2 px-4"
                role="alert"
              >
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
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
