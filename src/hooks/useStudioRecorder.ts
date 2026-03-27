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

export type StudioPreviewFraming = {
  fit: 'cover' | 'contain';
  objectPosition: string;
  stageAspect: '9 / 16' | '3 / 4';
};

const STUDIO_STAGE_RATIO = 9 / 16;
const RATIO_EPSILON = 0.015;

function resolvePreviewFraming(params: {
  sourceRatio: number | null;
  isMobile: boolean;
  camera: 'user' | 'environment';
}): StudioPreviewFraming {
  const { sourceRatio, isMobile, camera } = params;
  if (!sourceRatio || !Number.isFinite(sourceRatio)) {
    return {
      fit: 'cover',
      objectPosition: camera === 'user' ? '50% 33%' : '50% 50%',
      stageAspect: isMobile ? '9 / 16' : '3 / 4',
    };
  }

  if (!isMobile) {
    return {
      fit: 'cover',
      objectPosition: camera === 'user' ? '50% 34%' : '50% 50%',
      stageAspect: sourceRatio > 0.72 ? '3 / 4' : '9 / 16',
    };
  }

  const ratioDelta = sourceRatio - STUDIO_STAGE_RATIO;
  const isWiderThanStage = ratioDelta > RATIO_EPSILON;
  const isTallerThanStage = ratioDelta < -RATIO_EPSILON;

  // Creator preview should stay full-bleed like native short-video apps.
  // "contain" on wide selfie streams creates a letterboxed horizontal strip,
  // which feels broken even if it reduces crop. We keep cover and tune headroom.
  if (camera === 'user') {
    if (isWiderThanStage) return { fit: 'cover', objectPosition: '50% 34%', stageAspect: '9 / 16' };
    if (isTallerThanStage) return { fit: 'cover', objectPosition: '50% 30%', stageAspect: '9 / 16' };
    return { fit: 'cover', objectPosition: '50% 33%', stageAspect: '9 / 16' };
  }

  // Back camera remains full-bleed to preserve native capture feel.
  return { fit: 'cover', objectPosition: '50% 50%', stageAspect: '9 / 16' };
}

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
  /** Preview rendering fallback to avoid “zoomed” feeling when browser returns non-portrait tracks on mobile. */
  const [previewFraming, setPreviewFraming] = useState<StudioPreviewFraming>({
    fit: 'cover',
    objectPosition: '50% 33%',
    stageAspect: '9 / 16',
  });

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
    setPreviewFraming({ fit: 'cover', objectPosition: '50% 33%', stageAspect: '9 / 16' });
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
      // Mobile-first: stabilize selfie capture by default (TikTok-style framing),
      // while keeping desktop / larger screens able to switch lenses.
      const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(max-width: 768px)')?.matches === true;
      const mode: 'user' | 'environment' =
        facingOverride !== undefined ? facingOverride : isMobile ? 'user' : facingMode;
      if (facingOverride !== undefined) setFacingMode(mode);

      setError(null);
      resetRecorderOnly();
      stopStream();

      if (!isStudioRecordingSupported()) {
        const message = 'Studio recording is not available on this browser. Use Upload from device.';
        setError({ code: 'unsupported', message });
        return { ok: false, message, code: 'unsupported' };
      }

      try {
        // Mobile: portrait-friendly constraints without forcing crop-and-scale.
        const videoConstraints: MediaTrackConstraints = isMobile
          ? {
              facingMode: mode,
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 1280, max: 2560 },
              frameRate: { ideal: 30, max: 60 },
            }
          : {
              facingMode: mode,
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 960, max: 1440 },
              frameRate: { ideal: 30, max: 60 },
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Reset digital zoom to 1× when supported (Android). Avoid a second width/aspect apply — it often re-crops.
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

        // Some engines briefly expose tracks before readyState is "live"; treat anything not ended as usable.
        const audioTracks = stream.getAudioTracks().filter((t) => t.readyState !== 'ended');
        const videoTracks = stream.getVideoTracks().filter((t) => t.readyState !== 'ended');
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

        // If front camera resolves as landscape-like on mobile, request portrait-friendly track geometry once more.
        // Some browsers initially return a wide stream even when portrait constraints were requested.
        try {
          const vt = videoTracks[0];
          const initial = vt?.getSettings?.() as MediaTrackSettings | undefined;
          const initialRatio =
            typeof initial?.aspectRatio === 'number'
              ? initial.aspectRatio
              : initial?.width && initial?.height
                ? initial.width / initial.height
                : null;
          if (isMobile && mode === 'user' && initialRatio && initialRatio > 1) {
            await vt.applyConstraints({
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 1280, max: 2560 },
            });
          }
        } catch {
          /* non-fatal */
        }

        // Determine framing from actual stream dimensions (not only requested constraints).
        // Safari can ignore or reinterpret ideal ratios, so metadata-driven composition is required.
        try {
          const vt = videoTracks[0];
          const s = vt?.getSettings?.() as MediaTrackSettings | undefined;
          const ratioFromWH = s?.width && s?.height ? s.width / s.height : null;
          const sourceRatio = typeof s?.aspectRatio === 'number' ? s.aspectRatio : ratioFromWH;
          setPreviewFraming(resolvePreviewFraming({ sourceRatio, isMobile, camera: mode }));
        } catch {
          setPreviewFraming(resolvePreviewFraming({ sourceRatio: null, isMobile, camera: mode }));
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
          const applyFramingFromElement = () => {
            if (el.videoWidth > 0 && el.videoHeight > 0) {
              const sourceRatio = el.videoWidth / el.videoHeight;
              setPreviewFraming(resolvePreviewFraming({ sourceRatio, isMobile, camera: mode }));
            }
          };
          applyFramingFromElement();
          el.onloadedmetadata = () => applyFramingFromElement();
          // onresize is supported for HTMLVideoElement and keeps framing stable on stream renegotiation.
          el.onresize = () => applyFramingFromElement();
        }
        setPhase('preview');
        return { ok: true };
      } catch (e) {
        const err = e as DOMException & { message?: string };
        const name = err?.name ?? '';
        const msgLower = (err?.message ?? '').toLowerCase();
        // Delayed or non-gesture getUserMedia often reports NotAllowedError even when the user did not choose "Block".
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          const message =
            'The browser did not allow camera/mic access (often if the request was not started directly from your tap). Tap “Enter live room” again and allow when prompted — or reset camera/mic permissions for this site in browser settings.';
          setError({ code: 'permission_denied', message });
          return { ok: false, message, code: 'permission_denied' };
        }
        if (name === 'SecurityError' || msgLower.includes('secure context')) {
          const message = 'Camera and microphone require a secure connection (HTTPS). Open the site over HTTPS and try again.';
          setError({ code: 'permission_denied', message });
          return { ok: false, message, code: 'permission_denied' };
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          const message = 'Camera or microphone is busy or unavailable. Close other apps using the camera, then try again.';
          setError({ code: 'unknown', message });
          return { ok: false, message, code: 'unknown' };
        }
        if (name === 'OverconstrainedError') {
          const message = 'These camera settings are not supported on this device. Try again or use Upload from device.';
          setError({ code: 'unknown', message });
          return { ok: false, message, code: 'unknown' };
        }
        if (name === 'NotFoundError') {
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
    previewFraming,
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
