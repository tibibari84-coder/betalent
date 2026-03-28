'use client';

import { useCallback, useMemo } from 'react';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useRecorder, type StudioRecordingState } from '@/hooks/useRecorder';
import { logStudioCamera } from '@/lib/studio-camera-log';
import type { StudioPreviewFraming } from '@/lib/studio/studio-preview-framing';
import type {
  StudioCameraPermissionState,
  StudioPreviewResult,
  StudioRecorderErrorCode,
  StudioRecorderPhase,
  StudioTakeResult,
} from '@/lib/studio/studio-recorder-types';
import { isStudioRecordingSupported } from '@/lib/studio/studio-recorder-support';

export type { StudioPreviewFraming } from '@/lib/studio/studio-preview-framing';
export { isStudioRecordingSupported };

export type {
  StudioCameraPermissionState,
  StudioRecorderErrorCode,
  StudioPreviewResult,
  StudioRecorderPhase,
  StudioTakeResult,
} from '@/lib/studio/studio-recorder-types';

/** Stable framing hint for review / legacy callers — live preview uses `object-contain` in `CameraPreview`. */
export const DEFAULT_STUDIO_PREVIEW_FRAMING: StudioPreviewFraming = {
  fit: 'contain',
  objectPosition: '50% 50%',
  stageAspect: '9 / 16',
};

function derivePhase(
  lastTake: StudioTakeResult | null,
  recState: StudioRecordingState,
  streamReady: boolean,
  permissionState: StudioCameraPermissionState
): StudioRecorderPhase {
  if (lastTake) return 'stopped';
  if (recState === 'recording' || recState === 'paused' || recState === 'stopping') {
    return recState === 'paused' ? 'paused' : 'recording';
  }
  if (streamReady && permissionState === 'granted') return 'preview';
  return 'idle';
}

export function useStudioRecorder(maxDurationSec: number) {
  const camera = useCameraStream();
  const recorder = useRecorder({
    streamRef: camera.streamRef,
    videoRef: camera.videoRef,
    maxDurationSec,
    stopStream: camera.stopStream,
    onRecordingError: (e) => {
      camera.setError({ code: e.code as StudioRecorderErrorCode, message: e.message });
      camera.setPermissionState('error');
    },
  });

  const startPreview = useCallback(
    async (facingOverride?: 'user' | 'environment'): Promise<StudioPreviewResult> => {
      recorder.resetRecorderRefsOnly();
      return camera.startPreview(facingOverride);
    },
    [camera, recorder]
  );

  const hardResetCamera = useCallback(async (): Promise<StudioPreviewResult> => {
    logStudioCamera('camera_reset', { action: 'hard_reset' });
    recorder.resetRecorderRefsOnly();
    return startPreview();
  }, [recorder, startPreview]);

  const flipCamera = useCallback(async (): Promise<StudioPreviewResult> => {
    if (recorder.recordingState === 'recording' || recorder.recordingState === 'paused') {
      return { ok: false, message: 'Stop the take before switching camera.', code: 'unknown' };
    }
    recorder.resetRecorderRefsOnly();
    const next = camera.facingMode === 'user' ? 'environment' : 'user';
    return camera.startPreview(next);
  }, [camera, recorder]);

  const enterBooth = useCallback(async (): Promise<StudioPreviewResult> => {
    return startPreview();
  }, [startPreview]);

  const leaveBooth = useCallback(() => {
    recorder.resetRecorderRefsOnly();
    recorder.consumeLastTake();
    camera.stopStream();
    camera.setError(null);
  }, [camera, recorder]);

  const discardRecording = useCallback(async (): Promise<StudioPreviewResult> => {
    recorder.resetRecorderRefsOnly();
    return startPreview();
  }, [recorder, startPreview]);

  const phase = useMemo(
    () =>
      derivePhase(
        recorder.lastTake,
        recorder.recordingState,
        camera.streamState === 'ready',
        camera.permissionState
      ),
    [recorder.lastTake, recorder.recordingState, camera.streamState, camera.permissionState]
  );

  const consumeLastTake = useCallback(() => {
    recorder.consumeLastTake();
  }, [recorder]);

  return {
    videoRef: camera.videoRef,
    phase,
    permissionState: camera.permissionState,
    isAcquiringStream: camera.isAcquiringStream,
    error: camera.error,
    setError: camera.setError,
    elapsedSec: recorder.elapsedSec,
    elapsedMs: recorder.elapsedMs,
    maxDurationSec,
    previewFraming: DEFAULT_STUDIO_PREVIEW_FRAMING,
    facingMode: camera.facingMode,
    pauseSupported: recorder.pauseSupported,
    micLive: camera.micLive,
    lastTake: recorder.lastTake,
    consumeLastTake,
    enterBooth,
    leaveBooth,
    startRecording: recorder.startRecording,
    pauseRecording: recorder.pauseRecording,
    resumeRecording: recorder.resumeRecording,
    stopRecording: recorder.stopRecording,
    discardRecording,
    flipCamera,
    startPreview,
    hardResetCamera,
  };
}
