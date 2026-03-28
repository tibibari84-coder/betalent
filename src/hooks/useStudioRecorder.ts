'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { logStudioCamera } from '@/lib/studio-camera-log';
import { acquireVideoStreamWithFallback, STUDIO_AUDIO_CONSTRAINTS } from '@/lib/studio/studio-camera-constraints';
import { resolvePreviewFraming } from '@/lib/studio/studio-preview-framing';
import type { StudioPreviewFraming } from '@/lib/studio/studio-preview-framing';

export type { StudioPreviewFraming } from '@/lib/studio/studio-preview-framing';

export type StudioCameraPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export type StudioRecorderErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'microphone_permission_denied'
  | 'no_microphone'
  | 'no_camera'
  | 'recorder_not_supported'
  | 'unknown';

export type StudioRecorderPhase = 'idle' | 'preview' | 'recording' | 'paused' | 'stopped';

/** Result of opening camera + mic preview (used for transition UI + error copy). */
export type StudioPreviewResult =
  | { ok: true }
  | { ok: false; message: string; code: StudioRecorderErrorCode };


type StudioPreviewFailure = Extract<StudioPreviewResult, { ok: false }>;

export type StudioTakeResult = {
  blob: Blob;
  mimeType: string;
  fileExt: 'mp4' | 'webm';
  durationSec: number;
};

/** Best-effort: if browser says camera is already granted, NotAllowedError is often transient (timing, busy device). */
async function queryCameraPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function queryMicrophonePermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

type MediaPermissionGate = 'video' | 'audio';

/** Map DOMException from a single getUserMedia (video-only or audio-only) into UI + permission state. */
async function classifyGetUserMediaFailure(
  e: unknown,
  gate: MediaPermissionGate
): Promise<{
  result: StudioPreviewFailure;
  permissionState: StudioCameraPermissionState;
  logEvent: 'camera_permission_denied' | 'microphone_permission_denied' | null;
  logFields?: Record<string, unknown>;
}> {
  const err = e as DOMException & { message?: string };
  const name = err?.name ?? '';
  const msgLower = (err?.message ?? '').toLowerCase();

  const cameraBlockedMsg =
    'Camera is blocked or not allowed for this site. In Chrome, click the lock or camera icon in the address bar → Site settings → set Camera to Allow. Camera and Microphone are listed separately — the mic can be on while the camera is still blocked.';
  const micBlockedMsg =
    'Microphone is blocked or not allowed for this site. In Chrome, open Site settings (lock icon) and set Microphone to Allow — it is separate from Camera — then tap Try again.';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    if (gate === 'audio') {
      const perm = await queryMicrophonePermissionState();
      if (perm === 'granted') {
        return {
          result: {
            ok: false,
            code: 'unknown',
            message:
              'Microphone could not start even though permission is on. Try “Reset camera”, close other apps using the mic, or reload the page.',
          },
          permissionState: 'error',
          logEvent: 'microphone_permission_denied',
          logFields: { reason: name, note: 'api_says_granted' },
        };
      }
      // Chrome site toggles can show Allow while Permissions API still returns prompt/unknown.
      // Only treat as a hard “blocked in settings” when the API reports denied.
      if (perm === 'denied') {
        return {
          result: { ok: false, code: 'microphone_permission_denied', message: micBlockedMsg },
          permissionState: 'denied',
          logEvent: 'microphone_permission_denied',
          logFields: { reason: name, permissionQuery: perm },
        };
      }
      return {
        result: {
          ok: false,
          code: 'unknown',
          message:
            'Could not start the microphone. Tap Try again, or reload the page. If access is already allowed for this site, another app may be using the mic.',
        },
        permissionState: 'error',
        logEvent: 'microphone_permission_denied',
        logFields: { reason: name, permissionQuery: perm, note: 'not_explicit_denied' },
      };
    }
    const perm = await queryCameraPermissionState();
    if (perm === 'granted') {
      return {
        result: {
          ok: false,
          code: 'unknown',
          message:
            'Camera could not start even though permission is on. Try “Reset camera”, close other apps using the camera, or reload the page.',
        },
        permissionState: 'error',
        logEvent: 'camera_permission_denied',
        logFields: { reason: name, note: 'api_says_granted' },
      };
    }
    if (perm === 'denied') {
      return {
        result: { ok: false, code: 'permission_denied', message: cameraBlockedMsg },
        permissionState: 'denied',
        logEvent: 'camera_permission_denied',
        logFields: { reason: name, permissionQuery: perm },
      };
    }
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          'Could not start the camera. Tap Try again once. If Chrome already shows Camera Allow for this site, the request may still fail while another app uses the camera, or before a reload — try closing other tabs that use the camera, then reload this page.',
      },
      permissionState: 'error',
      logEvent: 'camera_permission_denied',
      logFields: { reason: name, permissionQuery: perm, note: 'not_explicit_denied' },
    };
  }

  if (name === 'SecurityError' || msgLower.includes('secure context')) {
    return {
      result: {
        ok: false,
        code: gate === 'audio' ? 'microphone_permission_denied' : 'permission_denied',
        message:
          'Camera and microphone require a secure connection (HTTPS). Open the site over HTTPS and try again.',
      },
      permissionState: 'denied',
      logEvent: gate === 'audio' ? 'microphone_permission_denied' : 'camera_permission_denied',
      logFields: { reason: 'security' },
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          gate === 'video'
            ? 'Camera is busy or unavailable. Close other apps using the camera, then try again.'
            : 'Microphone is busy or unavailable. Close other apps using the mic, then try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  if (name === 'OverconstrainedError') {
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          gate === 'video'
            ? 'These camera settings are not supported on this device. Try again.'
            : 'These microphone settings are not supported. Try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  if (name === 'NotFoundError') {
    return {
      result: {
        ok: false,
        code: gate === 'video' ? 'no_camera' : 'no_microphone',
        message:
          gate === 'video'
            ? 'No suitable camera was found. Connect a camera or try another device.'
            : 'No microphone was found. Connect a mic and try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  return {
    result: {
      ok: false,
      code: 'unknown',
      message:
        gate === 'video'
          ? 'We couldn’t open the camera. Please try again.'
          : 'We couldn’t open the microphone. Please try again.',
    },
    permissionState: 'error',
    logEvent: null,
  };
}

/**
 * Release MediaStream tracks and detach video without React setState — call immediately before
 * getUserMedia in the same user-gesture tick so Chrome does not drop user activation.
 */
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

/** Same as resetRecorderOnly but no setState — keeps user activation for getUserMedia. */
function resetRecorderRefsOnly(
  recorderRef: MutableRefObject<MediaRecorder | null>,
  chunksRef: MutableRefObject<Blob[]>,
  clearTimer: () => void,
  lastElapsedSecRef: MutableRefObject<number>,
  lastElapsedMsRef: MutableRefObject<number>,
  pauseStartedAtRef: MutableRefObject<number | null>,
  pausedMsAccumRef: MutableRefObject<number>,
  recordSegmentStartRef: MutableRefObject<number>,
  autoStopRequestedRef: MutableRefObject<boolean>
): void {
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
  lastElapsedSecRef.current = 0;
  lastElapsedMsRef.current = 0;
  pauseStartedAtRef.current = null;
  pausedMsAccumRef.current = 0;
  recordSegmentStartRef.current = 0;
  autoStopRequestedRef.current = false;
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
  const [permissionState, setPermissionState] = useState<StudioCameraPermissionState>('idle');
  /** True from start of getUserMedia until preview is live or attempt fails — UI must not treat this as permission denied. */
  const [isAcquiringStream, setIsAcquiringStream] = useState(false);
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
      const el = videoRef.current;
      el.srcObject = null;
      el.onloadedmetadata = null;
      el.onresize = null;
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

      // Minimal React updates before getUserMedia: avoid stopStream()/resetRecorderOnly() here — they
      // call setState and can cause Chrome to drop user activation before the first media prompt.
      setError(null);
      setIsAcquiringStream(true);
      setPermissionState('requesting');
      logStudioCamera('camera_permission_requested', { facingMode: mode, isMobile });

      resetRecorderRefsOnly(
        recorderRef,
        chunksRef,
        clearTimer,
        lastElapsedSecRef,
        lastElapsedMsRef,
        pauseStartedAtRef,
        pausedMsAccumRef,
        recordSegmentStartRef,
        autoStopRequestedRef
      );
      releaseTracksOnlySync(streamRef, videoRef);

      if (!isStudioRecordingSupported()) {
        const message = 'Studio recording is not available on this browser. Try Safari or Chrome.';
        setError({ code: 'unsupported', message });
        setPermissionState('error');
        setIsAcquiringStream(false);
        return { ok: false, message, code: 'unsupported' };
      }

      try {
        // Chrome lists Camera and Microphone separately in site settings. Requesting them in one call can fail
        // the whole prompt when only one side is blocked; split so each gate matches the failing device.
        let videoStream: MediaStream;
        try {
          videoStream = await acquireVideoStreamWithFallback(mode, isMobile);
        } catch (ve) {
          setPhase('idle');
          setIsAcquiringStream(false);
          const verr = ve as DOMException & { message?: string };
          console.error('[useStudioRecorder] getUserMedia (video) failed', {
            name: verr?.name,
            message: verr?.message,
            code: (verr as DOMException)?.code,
            error: ve,
          });
          const mapped = await classifyGetUserMediaFailure(ve, 'video');
          setError({ code: mapped.result.code, message: mapped.result.message });
          setPermissionState(mapped.permissionState);
          if (mapped.logEvent) logStudioCamera(mapped.logEvent, mapped.logFields);
          return mapped.result;
        }

        let audioStream: MediaStream;
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: STUDIO_AUDIO_CONSTRAINTS,
          });
        } catch (ae) {
          videoStream.getTracks().forEach((t) => t.stop());
          setPhase('idle');
          setIsAcquiringStream(false);
          const aerr = ae as DOMException & { message?: string };
          console.error('[useStudioRecorder] getUserMedia (audio) failed', {
            name: aerr?.name,
            message: aerr?.message,
            code: (aerr as DOMException)?.code,
            error: ae,
          });
          const mapped = await classifyGetUserMediaFailure(ae, 'audio');
          setError({ code: mapped.result.code, message: mapped.result.message });
          setPermissionState(mapped.permissionState);
          if (mapped.logEvent) logStudioCamera(mapped.logEvent, mapped.logFields);
          return mapped.result;
        }

        const stream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);

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
          setPermissionState('error');
          setPhase('idle');
          setIsAcquiringStream(false);
          return { ok: false, message, code: 'no_microphone' };
        }
        if (!videoTracks.length) {
          stream.getTracks().forEach((t) => t.stop());
          const message = 'Camera not detected. Connect a camera and try again.';
          setError({ code: 'no_camera', message });
          setPermissionState('error');
          setPhase('idle');
          setIsAcquiringStream(false);
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
              width: { ideal: 1080, max: 1920 },
              height: { ideal: 1920, max: 2560 },
              aspectRatio: { ideal: 9 / 16 },
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
        if (facingOverride !== undefined) setFacingMode(mode);
        setMicLive(true);
        setElapsedSec(0);
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
        setPermissionState('granted');
        setPhase('preview');
        setIsAcquiringStream(false);
        logStudioCamera('camera_permission_granted', { facingMode: mode, isMobile });
        logStudioCamera('camera_initialized', { facingMode: mode, isMobile });
        return { ok: true };
      } catch (e) {
        stopStream();
        setPhase('idle');
        setIsAcquiringStream(false);
        console.error('[useStudioRecorder] preview pipeline failed after tracks acquired', { error: e });
        const message = 'We couldn’t finish opening the camera preview. Please try again.';
        setError({ code: 'unknown', message });
        setPermissionState('error');
        return { ok: false, message, code: 'unknown' };
      }
    },
    [facingMode, stopStream, clearTimer]
  );

  /** Stop tracks, detach video, then open preview again (same as fresh getUserMedia). */
  const hardResetCamera = useCallback(async (): Promise<StudioPreviewResult> => {
    logStudioCamera('camera_retry', { action: 'hard_reset' });
    resetRecorderRefsOnly(
      recorderRef,
      chunksRef,
      clearTimer,
      lastElapsedSecRef,
      lastElapsedMsRef,
      pauseStartedAtRef,
      pausedMsAccumRef,
      recordSegmentStartRef,
      autoStopRequestedRef
    );
    releaseTracksOnlySync(streamRef, videoRef);
    return startPreview();
  }, [startPreview]);

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
    if (phase !== 'preview') return;
    if (!stream) {
      setError({
        code: 'unknown',
        message: 'Camera is not active. Use “Try again” or “Reset camera” below.',
      });
      setPermissionState('error');
      setPhase('idle');
      setIsAcquiringStream(false);
      return;
    }

    const { mimeType, fileExt } = pickRecorderMime();
    if (!mimeType) {
      setError({
        code: 'recorder_not_supported',
        message: 'This browser cannot start studio recording. Try another browser.',
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
      logStudioCamera('recording_failed', { reason: 'mediarecorder_constructor', mimeType });
      setError({
        code: 'recorder_not_supported',
        message: 'Studio recorder could not start. Try again or reload the page.',
      });
      return;
    }

    recorderRef.current = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const wasAutoStop = autoStopRequestedRef.current;
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

      if (blob.size < 32) {
        logStudioCamera('recording_failed', {
          reason: 'empty_or_tiny_blob',
          wasAutoStop,
          durationSec: cappedDur,
        });
      } else if (wasAutoStop) {
        logStudioCamera('recording_auto_stopped', { durationSec: cappedDur, mimeType: type });
      } else {
        logStudioCamera('recording_stopped', { durationSec: cappedDur, mimeType: type });
      }
      stopStream();
      if (videoRef.current) videoRef.current.srcObject = null;
      setPhase('stopped');
      setPermissionState('idle');
      setIsAcquiringStream(false);
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
      logStudioCamera('recording_failed', { reason: 'recorder_start_throw', mimeType });
      setError({
        code: 'recorder_not_supported',
        message: 'Recording could not start. Please try again.',
      });
      recorderRef.current = null;
      return;
    }

    logStudioCamera('recording_started', {
      maxDurationSec: maxDurationRef.current,
      mimeType,
    });

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
    resetRecorderRefsOnly(
      recorderRef,
      chunksRef,
      clearTimer,
      lastElapsedSecRef,
      lastElapsedMsRef,
      pauseStartedAtRef,
      pausedMsAccumRef,
      recordSegmentStartRef,
      autoStopRequestedRef
    );
    releaseTracksOnlySync(streamRef, videoRef);
    return startPreview();
  }, [startPreview]);

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
    setPermissionState('idle');
    setIsAcquiringStream(false);
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
    permissionState,
    isAcquiringStream,
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
    hardResetCamera,
  };
}
