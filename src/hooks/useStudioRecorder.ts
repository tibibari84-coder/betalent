'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export type StudioRecorderErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'no_microphone'
  | 'no_camera'
  | 'recorder_not_supported'
  | 'unknown';

export type StudioRecorderPhase = 'idle' | 'preview' | 'recording' | 'paused' | 'stopped';

/** Result of opening camera + mic preview (used for transition UI + error copy). */
export type StudioPreviewResult =
  | { ok: true }
  | { ok: false; message: string; code: StudioRecorderErrorCode };

export type StudioTakeResult = {
  blob: Blob;
  mimeType: string;
  fileExt: 'mp4' | 'webm';
  durationSec: number;
};

function pickRecorderMime(): { mimeType: string; fileExt: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', fileExt: 'webm' };
  }
  const candidates: { mime: string; ext: 'mp4' | 'webm' }[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mime: 'video/mp4;codecs=avc1.4D401E,mp4a.40.2', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, fileExt: c.ext };
    }
  }
  return { mimeType: '', fileExt: 'webm' };
}

export function isStudioRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function useStudioRecorder(maxDurationSec: number) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>('');
  const fileExtRef = useRef<'mp4' | 'webm'>('webm');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Wall-clock when current recording segment started (after resume, advances by paused duration). */
  const recordSegmentStartRef = useRef<number>(0);
  /** Accumulated paused milliseconds during this take. */
  const pausedMsAccumRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const lastElapsedSecRef = useRef(0);
  const lastElapsedMsRef = useRef(0);
  const maxDurationRef = useRef(maxDurationSec);
  const stopResolveRef = useRef<((v: StudioTakeResult | null) => void) | null>(null);
  const autoStopRequestedRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [phase, setPhase] = useState<StudioRecorderPhase>('idle');
  const [error, setError] = useState<{ code: StudioRecorderErrorCode; message: string } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pauseSupported, setPauseSupported] = useState(true);
  /** Live audio input is active (stream has a live audio track). */
  const [micLive, setMicLive] = useState(false);
  /** Last finalized take (manual stop or auto-stop at cap). */
  const [lastTake, setLastTake] = useState<StudioTakeResult | null>(null);

  useEffect(() => {
    maxDurationRef.current = maxDurationSec;
  }, [maxDurationSec]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicLive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetRecorderOnly = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    chunksRef.current = [];
    clearTimer();
    setElapsedSec(0);
    lastElapsedSecRef.current = 0;
    lastElapsedMsRef.current = 0;
    pauseStartedAtRef.current = null;
    pausedMsAccumRef.current = 0;
    recordSegmentStartRef.current = 0;
    autoStopRequestedRef.current = false;
  }, [clearTimer]);

  const startPreview = useCallback(
    async (facingOverride?: 'user' | 'environment'): Promise<StudioPreviewResult> => {
      // Recording UX requirement: front camera (selfie) framing by default.
      // Keep internal state for UI, but enforce user-facing constraints for consistent 9:16 capture.
      const mode: 'user' = 'user';
      if (facingOverride !== undefined) {
        setFacingMode('user');
      }

      setError(null);
      resetRecorderOnly();
      stopStream();

      if (!isStudioRecordingSupported()) {
        const message = 'Studio recording is not available on this browser. Use Upload from device.';
        setError({ code: 'unsupported', message });
        return { ok: false, message, code: 'unsupported' };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: 9 / 16,
            frameRate: { ideal: 30, max: 60 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Avoid device/browser default zoom if supported (Android zoom caps / iOS quirks).
        try {
          const vt = stream.getVideoTracks()[0];
          if (vt) {
            const caps = (vt.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
            if (caps.zoom) {
              await vt.applyConstraints({ advanced: [{ zoom: 1 }] } as unknown as MediaTrackConstraints);
            }
          }
        } catch {
          /* non-fatal */
        }

        const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === 'live');
        const videoTracks = stream.getVideoTracks().filter((t) => t.readyState === 'live');
        if (!audioTracks.length) {
          stream.getTracks().forEach((t) => t.stop());
          const message = 'Microphone not detected. Connect a mic and try again.';
          setError({ code: 'no_microphone', message });
          return { ok: false, message, code: 'no_microphone' };
        }
        if (!videoTracks.length) {
          stream.getTracks().forEach((t) => t.stop());
          const message = 'Camera not detected. Connect a camera or use Upload from device.';
          setError({ code: 'no_camera', message });
          return { ok: false, message, code: 'no_camera' };
        }

        streamRef.current = stream;
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
        setPhase('preview');
        return { ok: true };
      } catch (e) {
        const err = e as DOMException;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          const message = 'Camera and microphone access is blocked. Allow permissions and try again.';
          setError({ code: 'permission_denied', message });
          return { ok: false, message, code: 'permission_denied' };
        }
        if (err.name === 'NotFoundError') {
          const message = 'No suitable camera or microphone was found. Use Upload from device.';
          setError({ code: 'no_camera', message });
          return { ok: false, message, code: 'no_camera' };
        }
        const message = 'We couldn’t open your camera and microphone. Please try again.';
        setError({ code: 'unknown', message });
        return { ok: false, message, code: 'unknown' };
      }
    },
    [facingMode, resetRecorderOnly, stopStream]
  );

  useEffect(() => {
    return () => {
      clearTimer();
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      stopStream();
    };
  }, [clearTimer, stopStream]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || phase !== 'preview') return;

    const { mimeType, fileExt } = pickRecorderMime();
    if (!mimeType) {
      setError({
        code: 'recorder_not_supported',
        message: 'This browser cannot start studio recording. Try another browser or upload from device.',
      });
      return;
    }

    chunksRef.current = [];
    mimeRef.current = mimeType;
    fileExtRef.current = fileExt;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      setError({
        code: 'recorder_not_supported',
        message: 'Studio recorder could not start. Use Upload from device.',
      });
      return;
    }

    recorderRef.current = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const type = mimeRef.current || recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const actualSec = Math.max(1, Math.ceil(lastElapsedMsRef.current / 1000));
      const cappedDur = Math.min(maxDurationRef.current, actualSec);
      const take: StudioTakeResult = {
        blob,
        mimeType: type,
        fileExt: fileExtRef.current,
        durationSec: cappedDur,
      };

      chunksRef.current = [];
      recorderRef.current = null;
      autoStopRequestedRef.current = false;
      stopStream();
      if (videoRef.current) videoRef.current.srcObject = null;
      setPhase('stopped');
      setLastTake(take);

      const resolver = stopResolveRef.current;
      stopResolveRef.current = null;
      if (resolver) {
        resolver(take);
      }
    };

    try {
      recorder.start(250);
    } catch {
      setError({
        code: 'recorder_not_supported',
        message: 'Recording could not start. Please try again or use Upload from device.',
      });
      recorderRef.current = null;
      return;
    }

    setPauseSupported(typeof recorder.pause === 'function');
    setPhase('recording');
    setElapsedSec(0);
    lastElapsedSecRef.current = 0;
    lastElapsedMsRef.current = 0;
    autoStopRequestedRef.current = false;
    pausedMsAccumRef.current = 0;
    pauseStartedAtRef.current = null;
    recordSegmentStartRef.current = Date.now();
    clearTimer();

    timerRef.current = setInterval(() => {
      const EARLY_STOP_MS = 250;
      let pauseExtra = 0;
      if (pauseStartedAtRef.current != null) {
        pauseExtra = Date.now() - pauseStartedAtRef.current;
      }
      const elapsedMs = Date.now() - recordSegmentStartRef.current - pausedMsAccumRef.current - pauseExtra;
      lastElapsedMsRef.current = Math.max(0, elapsedMs);
      const sec = Math.max(0, Math.floor(elapsedMs / 1000));
      lastElapsedSecRef.current = sec;
      setElapsedSec(sec);
      if (
        !autoStopRequestedRef.current &&
        elapsedMs >= maxDurationRef.current * 1000 - EARLY_STOP_MS &&
        recorder.state === 'recording'
      ) {
        try {
          // Trigger slightly early to absorb MediaRecorder finalization latency.
          autoStopRequestedRef.current = true;
          recorder.requestData?.();
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }, 200);
  }, [phase, clearTimer, stopStream]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    try {
      rec.pause();
      pauseStartedAtRef.current = Date.now();
      setPhase('paused');
    } catch {
      setPauseSupported(false);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'paused') return;
    try {
      rec.resume();
      if (pauseStartedAtRef.current != null) {
        pausedMsAccumRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
      setPhase('recording');
    } catch {
      /* ignore */
    }
  }, []);

  const stopRecording = useCallback((): Promise<{
    blob: Blob;
    mimeType: string;
    fileExt: 'mp4' | 'webm';
    durationSec: number;
  } | null> => {
    return new Promise((resolve) => {
      clearTimer();
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        setPhase('preview');
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      try {
        rec.requestData?.();
        rec.stop();
      } catch {
        stopResolveRef.current = null;
        setPhase('preview');
        resolve(null);
      }
    });
  }, [clearTimer]);

  const discardRecording = useCallback(async (): Promise<StudioPreviewResult> => {
    resetRecorderOnly();
    setPhase('idle');
    return startPreview();
  }, [resetRecorderOnly, startPreview]);

  const flipCamera = useCallback(async (): Promise<StudioPreviewResult> => {
    if (phase === 'recording') {
      return { ok: false, message: 'Stop the take before switching camera.', code: 'unknown' };
    }
    const next = facingMode === 'user' ? 'environment' : 'user';
    return startPreview(next);
  }, [facingMode, phase, startPreview]);

  /** Open camera + mic preview (after UI curtain / permission). */
  const enterBooth = useCallback(async (): Promise<StudioPreviewResult> => {
    return startPreview();
  }, [startPreview]);

  const leaveBooth = useCallback(() => {
    resetRecorderOnly();
    stopStream();
    setPhase('idle');
    setElapsedSec(0);
    setError(null);
    setMicLive(false);
    setLastTake(null);
  }, [resetRecorderOnly, stopStream]);

  const consumeLastTake = useCallback(() => {
    setLastTake(null);
  }, []);

  return {
    videoRef,
    phase,
    error,
    setError,
    elapsedSec,
    maxDurationSec,
    facingMode,
    pauseSupported,
    micLive,
    lastTake,
    consumeLastTake,
    enterBooth,
    leaveBooth,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    flipCamera,
    startPreview,
  };
}
