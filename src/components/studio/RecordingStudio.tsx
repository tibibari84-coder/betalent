'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStudioRecorder, isStudioRecordingSupported } from '@/hooks/useStudioRecorder';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import type { RecordingMode } from '@/constants/recording-modes';
import { createFileForUpload } from '@/lib/upload-client';
import { logStudioCamera } from '@/lib/studio-camera-log';
import { normalizeRecorderMime } from './recording-mime';
import StudioSetupStep from './StudioSetupStep';
import StudioBoothStep from './StudioBoothStep';
import StudioReviewStep from './StudioReviewStep';

type StudioStep = 'setup' | 'booth' | 'review';

export type RecordingStudioProps = {
  maxDurationSec: number;
  mode?: RecordingMode;
  challengeSlug: string;
  challengeContext: ChallengeContextLite;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  styleSlug: string;
  setStyleSlug: (v: string) => void;
  challengeId: string;
  setChallengeId: (v: string) => void;
  contentType: 'ORIGINAL' | 'COVER' | 'REMIX';
  setContentType: (v: 'ORIGINAL' | 'COVER' | 'REMIX') => void;
  rulesAcknowledged: boolean;
  setRulesAcknowledged: (v: boolean) => void;
  t: (key: string) => string;
  onAcceptTake: (file: File, durationSec: number) => void;
  onClose: () => void;
  loading: boolean;
};

/** Curtain delay before camera — mobile only (desktop must call getUserMedia in the same gesture). */
const CURTAIN_MS = 520;
const RETAKE_CURTAIN_MS = 300;

/**
 * BETALENT Recording Studio v1: session prep → curtain + permissions → live preview → record → review → upload pipeline.
 */
export default function RecordingStudio(props: RecordingStudioProps) {
  const {
    maxDurationSec,
    mode = 'standard',
    challengeSlug,
    challengeContext,
    title,
    setTitle,
    description,
    setDescription,
    styleSlug,
    setStyleSlug,
    challengeId,
    setChallengeId,
    contentType,
    setContentType,
    rulesAcknowledged,
    setRulesAcknowledged,
    t,
    onAcceptTake,
    onClose,
    loading,
  } = props;

  const [step, setStep] = useState<StudioStep>('setup');
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

  const {
    videoRef,
    phase: recPhase,
    permissionState: cameraPermissionState,
    isAcquiringStream,
    error: recError,
    elapsedSec: recElapsedSec,
    pauseSupported,
    micLive,
    lastTake,
    previewFraming,
    consumeLastTake,
    enterBooth: studioEnterBooth,
    leaveBooth: studioLeaveBooth,
    startRecording: studioStartRecording,
    pauseRecording: studioPauseRecording,
    resumeRecording: studioResumeRecording,
    stopRecording: studioStopRecording,
    discardRecording: studioDiscardRecording,
    flipCamera: studioFlipCamera,
    startPreview: studioStartPreview,
    hardResetCamera: studioHardResetCamera,
    facingMode,
  } = useStudioRecorder(maxDurationSec);
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

  /** Title/caption are collected on the publish step after capture — not a gate to open camera. */
  const baseSetupValid =
    Boolean(styleSlug) &&
    (!challengeSlug || !challengeContext || challengeContext.status === 'ENTRY_OPEN');
  const setupValid = baseSetupValid && rulesAcknowledged;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobileStudio(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const cancelDuringCurtain = useCallback(() => {
    prepCancelledRef.current = true;
    studioLeaveBooth();
    setStep('setup');
    setShowCurtain(false);
    setBoothReady(false);
    setLocalError('');
  }, [studioLeaveBooth]);

  const cancelPreview = useCallback(() => {
    studioLeaveBooth();
    setStep('setup');
    setBoothReady(false);
    setShowCurtain(false);
    setLocalError('');
  }, [studioLeaveBooth]);

  const enterLiveRoom = useCallback(async (opts?: { fromRulesAccept?: boolean }) => {
    setLocalError('');
    const isRulesAcceptFlow = opts?.fromRulesAccept === true;
    const ready = isRulesAcceptFlow ? baseSetupValid : setupValid;
    if (!ready) {
      setLocalError('Complete your session details and confirm platform rules before opening the camera.');
      return;
    }
    if (!isStudioRecordingSupported()) {
      setLocalError('In-browser recording isn’t available in this browser. Try Safari or Chrome, or reload the page.');
      return;
    }
    prepCancelledRef.current = false;
    setStep('booth');
    setShowCurtain(true);
    setBoothReady(false);
    // Desktop: do not delay — Chrome/Safari treat delayed getUserMedia as non–user-initiated → NotAllowedError.
    // Mobile: keep short curtain delay (this flow was already working on phones).
    if (!isRulesAcceptFlow && isMobileStudio) {
      await new Promise((r) => setTimeout(r, CURTAIN_MS));
    }
    if (prepCancelledRef.current) return;
    const result = await studioEnterBooth();
    if (prepCancelledRef.current) {
      studioLeaveBooth();
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
  }, [isMobileStudio, baseSetupValid, setupValid, studioEnterBooth, studioLeaveBooth]);

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
    setBoothReady(false);
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
    setBoothReady(false);
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
    // Auto-stop at configured cap finalizes here as well.
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
      setStep('setup');
      setShowCurtain(false);
      return;
    }
    setBoothReady(true);
    setShowCurtain(false);
    setLocalError('');
  }, [isMobileStudio, studioDiscardRecording, studioLeaveBooth]);

  const handleUseTake = useCallback(() => {
    if (!reviewBlob) return;
    const mime = normalizeRecorderMime(reviewBlob.type);
    const name = `betalent-studio-${Date.now()}.${reviewExt}`;
    const file = createFileForUpload(reviewBlob, name, mime);
    const dur = Math.max(1, Math.min(maxDurationSec, reviewDurationSec));
    studioLeaveBooth();
    onAcceptTake(file, dur);
  }, [reviewBlob, reviewExt, maxDurationSec, reviewDurationSec, studioLeaveBooth, onAcceptTake]);

  const handleRulesAccepted = useCallback(() => {
    // Desktop only: trigger camera entry directly from the checkbox user gesture.
    if (isMobileStudio) return;
    if (step !== 'setup') return;
    if (!title.trim() || !styleSlug) return;
    void enterLiveRoom({ fromRulesAccept: true });
  }, [isMobileStudio, step, title, styleSlug, enterLiveRoom]);

  const handleClose = useCallback(() => {
    prepCancelledRef.current = true;
    studioLeaveBooth();
    setReviewBlob(null);
    setStep('setup');
    setBoothReady(false);
    setShowCurtain(false);
    setLocalError('');
    onClose();
  }, [studioLeaveBooth, onClose]);

  const goSetupFromReview = useCallback(() => {
    setReviewBlob(null);
    setLocalError('');
    studioLeaveBooth();
    setStep('setup');
    setBoothReady(false);
    setShowCurtain(false);
  }, [studioLeaveBooth]);

  if (step === 'setup') {
    return (
      <StudioSetupStep
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        styleSlug={styleSlug}
        setStyleSlug={setStyleSlug}
        challengeId={challengeId}
        setChallengeId={setChallengeId}
        challengeContext={challengeContext}
        contentType={contentType}
        setContentType={setContentType}
        rulesAcknowledged={rulesAcknowledged}
        setRulesAcknowledged={setRulesAcknowledged}
        onRulesAccepted={handleRulesAccepted}
        t={t}
        loading={loading}
        localError={localError}
        maxDurationSec={maxDurationSec}
        mode={mode}
        onEnterBooth={enterLiveRoom}
        onClose={handleClose}
      />
    );
  }

  if (step === 'booth') {
    return (
      <StudioBoothStep
        maxDurationSec={maxDurationSec}
        mode={mode}
        mirrorPreview={facingMode === 'user'}
        videoRef={videoRef}
        recPhase={recPhase}
        cameraPermissionState={cameraPermissionState}
        isAcquiringStream={isAcquiringStream}
        recElapsedSec={recElapsedSec}
        recError={recError}
        micLive={micLive}
        previewFraming={previewFraming}
        pauseSupported={pauseSupported}
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
        onPause={() => studioPauseRecording()}
        onResume={() => studioResumeRecording()}
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
      onEditSession={goSetupFromReview}
      onUseTake={handleUseTake}
    />
  );
}
