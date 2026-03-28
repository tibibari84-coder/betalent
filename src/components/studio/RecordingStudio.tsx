'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useStudioRecorder, isStudioRecordingSupported } from '@/hooks/useStudioRecorder';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import type { RecordingMode } from '@/constants/recording-modes';
import { createFileForUpload } from '@/lib/upload-client';
import { logStudioCamera } from '@/lib/studio-camera-log';
import { mimeForRecordedStudioBlob } from './recording-mime';
import StudioCameraScreen from './StudioCameraScreen';
import StudioReviewStep from './StudioReviewStep';

function studioDurationOptions(platformMaxSec: number): number[] {
  const long = Math.min(600, platformMaxSec);
  const base = [15, 60, long].filter((s) => s <= platformMaxSec && s >= 1);
  return Array.from(new Set(base)).sort((a, b) => a - b);
}

function defaultRecordingCap(platformMaxSec: number): number {
  const opts = studioDurationOptions(platformMaxSec);
  if (opts.includes(60)) return 60;
  return opts[opts.length - 1] ?? platformMaxSec;
}

type StudioStep = 'booth' | 'review';

export type RecordingStudioProps = {
  maxDurationSec: number;
  mode?: RecordingMode;
  challengeSlug: string;
  challengeContext: ChallengeContextLite;
  onAcceptTake: (file: File, durationSec: number) => void;
  onClose: () => void;
};

/** Curtain delay before camera — mobile only (desktop must call getUserMedia in the same gesture). */
const CURTAIN_MS = 520;
const RETAKE_CURTAIN_MS = 300;

/**
 * BETALENT Recording Studio: fullscreen camera-first → record → review → upload pipeline.
 */
export default function RecordingStudio(props: RecordingStudioProps) {
  const { maxDurationSec, mode = 'standard', challengeSlug, challengeContext, onAcceptTake, onClose } = props;

  const [step, setStep] = useState<StudioStep>('booth');
  const [isMobileStudio, setIsMobileStudio] = useState(false);
  const [boothReady, setBoothReady] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const [switchingLens, setSwitchingLens] = useState(false);
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewExt, setReviewExt] = useState<'mp4' | 'webm'>('webm');
  const [reviewDurationSec, setReviewDurationSec] = useState(1);
  const [localError, setLocalError] = useState('');
  const prepCancelledRef = useRef(false);

  const [recordingCapSec, setRecordingCapSec] = useState(() => defaultRecordingCap(maxDurationSec));

  const durationOptionList = useMemo(() => studioDurationOptions(maxDurationSec), [maxDurationSec]);

  useEffect(() => {
    setRecordingCapSec((prev) => {
      if (prev <= maxDurationSec && durationOptionList.includes(prev)) return prev;
      const under = durationOptionList.filter((s) => s <= maxDurationSec);
      return under[under.length - 1] ?? maxDurationSec;
    });
  }, [maxDurationSec, durationOptionList]);

  const {
    videoRef,
    phase: recPhase,
    permissionState: cameraPermissionState,
    isAcquiringStream,
    error: recError,
    elapsedSec: recElapsedSec,
    elapsedMs: recElapsedMs,
    micLive,
    lastTake,
    previewFraming,
    consumeLastTake,
    enterBooth: studioEnterBooth,
    leaveBooth: studioLeaveBooth,
    startRecording: studioStartRecording,
    stopRecording: studioStopRecording,
    discardRecording: studioDiscardRecording,
    flipCamera: studioFlipCamera,
    startPreview: studioStartPreview,
    hardResetCamera: studioHardResetCamera,
    facingMode,
  } = useStudioRecorder(recordingCapSec);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const studioActive = step === 'booth' || step === 'review';
    const body = document.body;
    if (!studioActive) {
      body.classList.remove('studio-mode-active');
      return;
    }
    body.classList.add('studio-mode-active');
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.classList.remove('studio-mode-active');
      body.style.overflow = prevOverflow;
    };
  }, [step]);

  useEffect(() => {
    if (!reviewBlob) {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      setReviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(reviewBlob);
    setReviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [reviewBlob]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobileStudio(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const enterBoothRef = useRef(studioEnterBooth);
  const leaveBoothRef = useRef(studioLeaveBooth);
  enterBoothRef.current = studioEnterBooth;
  leaveBoothRef.current = studioLeaveBooth;

  /** Boot: open camera once on mount (no prep screen). Refs avoid re-running when hook identities change. */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isStudioRecordingSupported()) {
        setLocalError(
          'In-browser recording isn’t available in this browser. Try Safari or Chrome, or reload the page.'
        );
        return;
      }
      setShowCurtain(true);
      setBoothReady(false);
      setLocalError('');
      const isMobile =
        typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
      await new Promise((r) => setTimeout(r, isMobile ? CURTAIN_MS : 0));
      if (cancelled) return;
      const result = await enterBoothRef.current();
      if (cancelled) {
        leaveBoothRef.current();
        return;
      }
      if (!result.ok) {
        setLocalError(result.message);
        setShowCurtain(false);
        setBoothReady(false);
        return;
      }
      setBoothReady(true);
      setShowCurtain(false);
      setLocalError('');
    };
    void run();
    return () => {
      cancelled = true;
      leaveBoothRef.current();
    };
  }, []);

  const cancelDuringCurtain = useCallback(() => {
    prepCancelledRef.current = true;
    studioLeaveBooth();
    setShowCurtain(false);
    setBoothReady(false);
    setLocalError('');
    onClose();
  }, [studioLeaveBooth, onClose]);

  const cancelPreview = useCallback(() => {
    studioLeaveBooth();
    setBoothReady(false);
    setShowCurtain(false);
    setLocalError('');
    onClose();
  }, [studioLeaveBooth, onClose]);

  const handleFlipCamera = useCallback(async () => {
    setSwitchingLens(true);
    setLocalError('');
    const result = await studioFlipCamera();
    setSwitchingLens(false);
    if (!result.ok) {
      setLocalError(result.message);
      setBoothReady(false);
    }
  }, [studioFlipCamera]);

  const handleRetryPreview = useCallback(async () => {
    logStudioCamera('camera_retry', { action: 'try_again' });
    setLocalError('');
    const result = await studioStartPreview();
    if (!result.ok) {
      setLocalError(result.message);
      setBoothReady(false);
      return;
    }
    setBoothReady(true);
  }, [studioStartPreview]);

  const handleHardResetCamera = useCallback(async () => {
    setLocalError('');
    const result = await studioHardResetCamera();
    if (!result.ok) {
      setLocalError(result.message);
      setBoothReady(false);
      return;
    }
    setBoothReady(true);
  }, [studioHardResetCamera]);

  useEffect(() => {
    if (step !== 'booth') return;
    if (recPhase !== 'idle') return;
    if (cameraPermissionState === 'error' || cameraPermissionState === 'denied') {
      setBoothReady(false);
    }
  }, [step, recPhase, cameraPermissionState]);

  useEffect(() => {
    if (step !== 'booth' || !lastTake) return;
    setReviewBlob(lastTake.blob);
    setReviewExt(lastTake.fileExt);
    setReviewDurationSec(lastTake.durationSec);
    setStep('review');
    consumeLastTake();
  }, [step, lastTake, consumeLastTake]);

  const handleStop = useCallback(async () => {
    setLocalError('');
    const result = await studioStopRecording();
    if (!result || result.blob.size < 1) {
      setLocalError('We could not capture that take. Please record again.');
      await studioDiscardRecording();
      return;
    }
    setReviewBlob(result.blob);
    setReviewExt(result.fileExt);
    setReviewDurationSec(result.durationSec);
    setStep('review');
    consumeLastTake();
  }, [studioStopRecording, studioDiscardRecording, consumeLastTake]);

  const handleRetake = useCallback(async () => {
    setReviewBlob(null);
    setLocalError('');
    prepCancelledRef.current = false;
    setStep('booth');
    setShowCurtain(true);
    setBoothReady(false);
    if (isMobileStudio) {
      await new Promise((r) => setTimeout(r, RETAKE_CURTAIN_MS));
    }
    if (prepCancelledRef.current) return;
    const result = await studioDiscardRecording();
    if (prepCancelledRef.current) {
      studioLeaveBooth();
      return;
    }
    if (!result.ok) {
      setLocalError(result.message);
      studioLeaveBooth();
      setShowCurtain(false);
      setBoothReady(false);
      return;
    }
    setBoothReady(true);
    setShowCurtain(false);
    setLocalError('');
  }, [isMobileStudio, studioDiscardRecording, studioLeaveBooth]);

  const handleUseTake = useCallback(() => {
    if (!reviewBlob) return;
    const mime = mimeForRecordedStudioBlob(reviewBlob, reviewExt);
    const name = `betalent-studio-${Date.now()}.${reviewExt}`;
    const file = createFileForUpload(reviewBlob, name, mime);
    const dur = Math.max(1, Math.min(maxDurationSec, reviewDurationSec));
    studioLeaveBooth();
    onAcceptTake(file, dur);
  }, [reviewBlob, reviewExt, maxDurationSec, reviewDurationSec, studioLeaveBooth, onAcceptTake]);

  const handleClose = useCallback(() => {
    prepCancelledRef.current = true;
    studioLeaveBooth();
    setReviewBlob(null);
    setBoothReady(false);
    setShowCurtain(false);
    setLocalError('');
    onClose();
  }, [studioLeaveBooth, onClose]);

  const exitFromReview = useCallback(() => {
    setReviewBlob(null);
    setLocalError('');
    studioLeaveBooth();
    onClose();
  }, [studioLeaveBooth, onClose]);

  const challengeInvalid =
    Boolean(challengeSlug) &&
    challengeContext &&
    challengeContext.status !== 'ENTRY_OPEN';

  if (challengeInvalid) {
    return (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black px-6 text-center">
        <p className="max-w-sm text-[15px] text-white/80">
          This challenge is not accepting entries right now. Close and return to the challenge page.
        </p>
        <button type="button" onClick={onClose} className="mt-6 min-h-[48px] rounded-full px-6 text-[15px] font-semibold text-accent">
          Close
        </button>
      </div>
    );
  }

  if (step === 'booth') {
    return (
      <StudioCameraScreen
        platformMaxDurationSec={maxDurationSec}
        recordingCapSec={recordingCapSec}
        onRecordingCapChange={setRecordingCapSec}
        mirrorPreview={facingMode === 'user'}
        videoRef={videoRef}
        recPhase={recPhase}
        cameraPermissionState={cameraPermissionState}
        isAcquiringStream={isAcquiringStream}
        recElapsedSec={recElapsedSec}
        recElapsedMs={recElapsedMs}
        recError={recError}
        micLive={micLive}
        showCurtain={showCurtain}
        switchingLens={switchingLens}
        boothReady={boothReady}
        localError={localError}
        onCancelDuringCurtain={cancelDuringCurtain}
        onCancelPreview={cancelPreview}
        onRetryPreview={() => void handleRetryPreview()}
        onHardResetCamera={() => void handleHardResetCamera()}
        onStartRecording={() => void studioStartRecording()}
        onFlipCamera={() => void handleFlipCamera()}
        onStop={() => void handleStop()}
      />
    );
  }

  return (
    <StudioReviewStep
      reviewUrl={reviewUrl}
      reviewVideoRef={reviewVideoRef}
      reviewDurationSec={reviewDurationSec}
      mode={mode}
      previewFraming={previewFraming}
      primaryActionLabel="Continue to publish"
      onRetake={() => void handleRetake()}
      onEditSession={exitFromReview}
      onUseTake={handleUseTake}
    />
  );
}
