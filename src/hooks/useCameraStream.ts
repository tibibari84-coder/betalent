'use client';

import { useRef, useState, useCallback, useEffect, type MutableRefObject, type RefObject } from 'react';
import { logStudioCamera } from '@/lib/studio-camera-log';
import { acquireStudioMedia } from '@/lib/studio/studio-stream-acquire';
import { classifyGetUserMediaFailure } from '@/lib/studio/studio-gum-classify';
import type {
  StudioCameraPermissionState,
  StudioPreviewResult,
  StudioRecorderErrorCode,
  StudioStreamState,
} from '@/lib/studio/studio-recorder-types';
import { isLikelyEmbeddedInIframe } from '@/lib/studio/studio-camera-environment';
import { isStudioRecordingSupported } from '@/lib/studio/studio-recorder-support';

function releaseTracksOnlySync(
  streamRef: MutableRefObject<MediaStream | null>,
  videoRef: RefObject<HTMLVideoElement | null>
): void {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  if (videoRef.current) {
    const el = videoRef.current;
    el.srcObject = null;
    el.onloadedmetadata = null;
    el.onresize = null;
  }
}

export type UseCameraStreamResult = {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamRef: MutableRefObject<MediaStream | null>;
  streamState: StudioStreamState;
  permissionState: StudioCameraPermissionState;
  isAcquiringStream: boolean;
  facingMode: 'user' | 'environment';
  micLive: boolean;
  error: { code: StudioRecorderErrorCode; message: string } | null;
  setError: React.Dispatch<React.SetStateAction<{ code: StudioRecorderErrorCode; message: string } | null>>;
  setPermissionState: React.Dispatch<React.SetStateAction<StudioCameraPermissionState>>;
  stopStream: () => void;
  startPreview: (facingOverride?: 'user' | 'environment') => Promise<StudioPreviewResult>;
};

export function useCameraStream(): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionState, setPermissionState] = useState<StudioCameraPermissionState>('idle');
  const [streamState, setStreamState] = useState<StudioStreamState>('idle');
  const [isAcquiringStream, setIsAcquiringStream] = useState(false);
  const [error, setError] = useState<{ code: StudioRecorderErrorCode; message: string } | null>(null);
  const [micLive, setMicLive] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicLive(false);
    setStreamState('idle');
    setPermissionState('idle');
    setIsAcquiringStream(false);
    if (videoRef.current) {
      const el = videoRef.current;
      el.srcObject = null;
      el.onloadedmetadata = null;
      el.onresize = null;
    }
  }, []);

  const startPreview = useCallback(
    async (facingOverride?: 'user' | 'environment'): Promise<StudioPreviewResult> => {
      const isMobile =
        typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)')?.matches === true;
      const mode: 'user' | 'environment' =
        facingOverride !== undefined ? facingOverride : isMobile ? 'user' : facingMode;

      setError(null);
      setIsAcquiringStream(true);
      setStreamState('loading');
      setPermissionState('requesting');
      logStudioCamera('camera_permission_requested', {
        facingMode: mode,
        isMobile,
        embeddedInIframe: isLikelyEmbeddedInIframe(),
      });

      releaseTracksOnlySync(streamRef, videoRef);

      if (!isStudioRecordingSupported()) {
        const message = 'Studio recording is not available on this browser. Try Safari or Chrome.';
        setError({ code: 'unsupported', message });
        setPermissionState('error');
        setStreamState('failed');
        setIsAcquiringStream(false);
        return { ok: false, message, code: 'unsupported' };
      }

      let stream: MediaStream;
      try {
        stream = await acquireStudioMedia(mode);
      } catch (e) {
        setStreamState('failed');
        setIsAcquiringStream(false);
        const ve = e as DOMException & { message?: string };
        console.error('[useCameraStream] getUserMedia failed', {
          name: ve?.name,
          message: ve?.message,
          code: (ve as DOMException)?.code,
          error: e,
        });
        const mapped = await classifyGetUserMediaFailure(e, 'video');
        setError({ code: mapped.result.code, message: mapped.result.message });
        setPermissionState(mapped.permissionState);
        if (mapped.logEvent) logStudioCamera(mapped.logEvent, mapped.logFields);
        return mapped.result;
      }

      try {
        const audioTracks = stream.getAudioTracks().filter((t) => t.readyState !== 'ended');
        const videoTracks = stream.getVideoTracks().filter((t) => t.readyState !== 'ended');
        if (!audioTracks.length) {
          stream.getTracks().forEach((t) => t.stop());
          const message = 'Microphone not detected. Connect a mic and try again.';
          setError({ code: 'no_microphone', message });
          setPermissionState('error');
          setStreamState('failed');
          setIsAcquiringStream(false);
          return { ok: false, message, code: 'no_microphone' };
        }
        if (!videoTracks.length) {
          stream.getTracks().forEach((t) => t.stop());
          const message = 'Camera not detected. Connect a camera and try again.';
          setError({ code: 'no_camera', message });
          setPermissionState('error');
          setStreamState('failed');
          setIsAcquiringStream(false);
          return { ok: false, message, code: 'no_camera' };
        }

        streamRef.current = stream;
        if (facingOverride !== undefined) setFacingMode(mode);
        setMicLive(true);
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          el.muted = true;
          el.playsInline = true;
          try {
            await el.play();
          } catch {
            /* autoplay policies */
          }
        }
        setPermissionState('granted');
        setStreamState('ready');
        setIsAcquiringStream(false);
        logStudioCamera('camera_permission_granted', { facingMode: mode, isMobile });
        logStudioCamera('camera_initialized', { facingMode: mode, isMobile });
        return { ok: true };
      } catch (e) {
        stopStream();
        setStreamState('failed');
        setIsAcquiringStream(false);
        console.error('[useCameraStream] preview pipeline failed after tracks acquired', { error: e });
        const message = 'We couldn’t finish opening the camera preview. Please try again.';
        setError({ code: 'unknown', message });
        setPermissionState('error');
        return { ok: false, message, code: 'unknown' };
      }
    },
    [facingMode, stopStream]
  );

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    streamRef,
    streamState,
    permissionState,
    isAcquiringStream,
    facingMode,
    micLive,
    error,
    setError,
    setPermissionState,
    stopStream,
    startPreview,
  };
}
