'use client';

import { useRef, useState, useCallback, useEffect, type MutableRefObject, type RefObject } from 'react';
import { logStudioCamera } from '@/lib/studio-camera-log';
import type { StudioTakeResult } from '@/lib/studio/studio-recorder-types';

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

export type StudioRecordingState = 'idle' | 'recording' | 'paused' | 'stopping' | 'finished' | 'failed';

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

export type UseRecorderOptions = {
  streamRef: MutableRefObject<MediaStream | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  maxDurationSec: number;
  /** Called after a take is finalized (stream already stopped inside hook). */
  stopStream: () => void;
  /** Recording failures that should surface in the studio error banner. */
  onRecordingError?: (e: { code: string; message: string }) => void;
};

export type UseRecorderResult = {
  recordingState: StudioRecordingState;
  elapsedSec: number;
  elapsedMs: number;
  lastTake: StudioTakeResult | null;
  pauseSupported: boolean;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<StudioTakeResult | null>;
  /** Clear recorder refs only (sync before getUserMedia). */
  resetRecorderRefsOnly: () => void;
  consumeLastTake: () => void;
};

export function useRecorder(opts: UseRecorderOptions): UseRecorderResult {
  const { streamRef, videoRef, maxDurationSec, stopStream, onRecordingError } = opts;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>('');
  const fileExtRef = useRef<'mp4' | 'webm'>('webm');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSegmentStartRef = useRef<number>(0);
  const pausedMsAccumRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const lastElapsedSecRef = useRef(0);
  const lastElapsedMsRef = useRef(0);
  const maxDurationRef = useRef(maxDurationSec);
  const stopResolveRef = useRef<((v: StudioTakeResult | null) => void) | null>(null);
  const autoStopRequestedRef = useRef(false);

  const [recordingState, setRecordingState] = useState<StudioRecordingState>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastTake, setLastTake] = useState<StudioTakeResult | null>(null);
  const [pauseSupported, setPauseSupported] = useState(false);
  const recordingStateRef = useRef<StudioRecordingState>('idle');

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    maxDurationRef.current = maxDurationSec;
  }, [maxDurationSec]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecorderRefsOnlyCb = useCallback(() => {
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
    setElapsedSec(0);
    setElapsedMs(0);
    setRecordingState('idle');
    recordingStateRef.current = 'idle';
  }, [clearTimer]);

  const consumeLastTake = useCallback(() => {
    setLastTake(null);
    setRecordingState('idle');
    recordingStateRef.current = 'idle';
  }, []);

  const reportErr = useCallback(
    (e: { code: string; message: string }) => {
      onRecordingError?.(e);
    },
    [onRecordingError]
  );

  const startRecording = useCallback(() => {
    if (recordingStateRef.current !== 'idle') return;
    const stream = streamRef.current;
    if (!stream) {
      reportErr({
        code: 'unknown',
        message: 'Camera is not active. Use “Try again” or “Reset camera” below.',
      });
      return;
    }

    const { mimeType, fileExt } = pickRecorderMime();
    if (!mimeType) {
      reportErr({
        code: 'recorder_not_supported',
        message: 'This browser cannot start studio recording. Try another browser.',
      });
      setRecordingState('failed');
      recordingStateRef.current = 'failed';
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
      reportErr({
        code: 'recorder_not_supported',
        message: 'Studio recorder could not start. Try again or reload the page.',
      });
      setRecordingState('failed');
      recordingStateRef.current = 'failed';
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
        setRecordingState('failed');
        recordingStateRef.current = 'failed';
      } else if (wasAutoStop) {
        logStudioCamera('recording_auto_stopped', { durationSec: cappedDur, mimeType: type });
        setRecordingState('finished');
        recordingStateRef.current = 'finished';
      } else {
        logStudioCamera('recording_stopped', { durationSec: cappedDur, mimeType: type });
        setRecordingState('finished');
        recordingStateRef.current = 'finished';
      }

      stopStream();
      if (videoRef.current) videoRef.current.srcObject = null;
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
      reportErr({
        code: 'recorder_not_supported',
        message: 'Recording could not start. Please try again.',
      });
      recorderRef.current = null;
      setRecordingState('failed');
      recordingStateRef.current = 'failed';
      return;
    }

    logStudioCamera('recording_started', {
      maxDurationSec: maxDurationRef.current,
      mimeType,
    });

    setPauseSupported(typeof recorder.pause === 'function');
    setRecordingState('recording');
    recordingStateRef.current = 'recording';
    setElapsedSec(0);
    setElapsedMs(0);
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
      const ms = Date.now() - recordSegmentStartRef.current - pausedMsAccumRef.current - pauseExtra;
      lastElapsedMsRef.current = Math.max(0, ms);
      setElapsedMs(lastElapsedMsRef.current);
      const sec = Math.max(0, Math.floor(ms / 1000));
      lastElapsedSecRef.current = sec;
      setElapsedSec(sec);
      if (
        !autoStopRequestedRef.current &&
        ms >= maxDurationRef.current * 1000 - EARLY_STOP_MS &&
        recorder.state === 'recording'
      ) {
        try {
          autoStopRequestedRef.current = true;
          recorder.requestData?.();
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }, 200);
  }, [clearTimer, reportErr, stopStream, streamRef, videoRef]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    try {
      rec.pause();
      pauseStartedAtRef.current = Date.now();
      setRecordingState('paused');
      recordingStateRef.current = 'paused';
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
      setRecordingState('recording');
      recordingStateRef.current = 'recording';
    } catch {
      /* ignore */
    }
  }, []);

  const stopRecording = useCallback((): Promise<StudioTakeResult | null> => {
    return new Promise((resolve) => {
      clearTimer();
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        setRecordingState('idle');
        recordingStateRef.current = 'idle';
        resolve(null);
        return;
      }
      setRecordingState('stopping');
      recordingStateRef.current = 'stopping';
      stopResolveRef.current = resolve;
      try {
        rec.requestData?.();
        rec.stop();
      } catch {
        stopResolveRef.current = null;
        setRecordingState('idle');
        recordingStateRef.current = 'idle';
        resolve(null);
      }
    });
  }, [clearTimer]);

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
    };
  }, [clearTimer]);

  return {
    recordingState,
    elapsedSec,
    elapsedMs,
    lastTake,
    pauseSupported,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecorderRefsOnly:     resetRecorderRefsOnlyCb,
    consumeLastTake,
  };
}
