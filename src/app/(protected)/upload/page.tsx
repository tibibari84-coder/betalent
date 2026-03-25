'use client';

/**
 * Upload Performance: device file and in-app Recording Studio (same File → performDirectUpload).
 * Uses mounted state to defer searchParams read and avoid hydration mismatch.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UploadProgressStep } from '@/lib/upload-client';
import {
  ENABLED_UPLOAD_SOURCES,
  getMimeTypeForUpload,
  MAX_VIDEO_FILE_SIZE,
  UPLOAD_SOURCE_FILE,
} from '@/constants/upload';
import type { RecordingMode } from '@/constants/recording-modes';
import {
  getLiveChallengeRecordingCapSec,
  getRecordingMaxDurationSec,
  LIVE_RECORDING_MAX_DURATION_SEC,
} from '@/constants/recording-modes';
import { performDirectUpload } from '@/lib/upload-client';
import { useI18n } from '@/contexts/I18nContext';
import UploadFormContent from './UploadFormContent';
import type { UploadEntryMode } from './UploadFormContent';

type UploadPhase = 'idle' | 'uploading' | 'success' | 'failed';
type ChallengeContext = {
  slug: string;
  title: string;
  status: string;
  maxDurationSec: number;
};

function toUiUploadError(message: string | undefined): string {
  const raw = (message ?? '').toLowerCase();
  if (!raw) return 'Upload failed. Please try again.';
  if (raw.includes('storage') || raw.includes('direct upload')) return 'Upload service is temporarily unavailable. Please try again.';
  if (raw.includes('permission') || raw.includes('login required')) return 'Please sign in and try again.';
  if (raw.includes('network')) return 'Network issue while uploading. Check your connection and try again.';
  if (raw.includes('unsupported') || raw.includes('invalid file type')) return 'Unsupported file type. Please choose another video.';
  if (raw.includes('max duration') || raw.includes('too long')) return 'This performance is too long. Please upload a shorter take.';
  if (raw.includes('file too large')) return 'This file is too large. Please choose a smaller one.';
  return 'Upload failed. Please try again.';
}

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [styleSlug, setStyleSlug] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [contentType, setContentType] = useState<'ORIGINAL' | 'COVER' | 'REMIX'>('ORIGINAL');
  const [commentPermission, setCommentPermission] = useState<'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF'>('EVERYONE');
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadProgressStep>('preparing');
  const [successVideoId, setSuccessVideoId] = useState<string | null>(null);
  const [successReady, setSuccessReady] = useState(false);
  const [challengeContext, setChallengeContext] = useState<ChallengeContext | null>(null);
  const [uploadEntryMode, setUploadEntryMode] = useState<UploadEntryMode>('studio');

  // Defer searchParams until mounted to avoid hydration mismatch (server has no URL)
  useEffect(() => setMounted(true), []);
  const challengeSlug = mounted ? (searchParams?.get('challenge')?.trim() ?? '') : '';

  const uploadSource = ENABLED_UPLOAD_SOURCES.includes(UPLOAD_SOURCE_FILE) ? UPLOAD_SOURCE_FILE : ENABLED_UPLOAD_SOURCES[0];

  const previewUrlStable = file && previewUrl ? previewUrl : null;
  const hasChallengeSlug = Boolean(challengeSlug);

  const isLiveChallengeStudio: boolean = Boolean(
    challengeSlug && challengeContext && challengeContext.status === 'ENTRY_OPEN'
  );
  const studioRecordingMode: RecordingMode = isLiveChallengeStudio ? 'live' : 'standard';

  /**
   * Client max must match server (init + createEntry): standard 90; with ?challenge= use challenge row when
   * loaded (OPEN), else platform live cap while details load (server still validates OPEN + slug).
   */
  const maxStudioDurationSec = !hasChallengeSlug
    ? getRecordingMaxDurationSec('standard')
    : !challengeContext
      ? LIVE_RECORDING_MAX_DURATION_SEC
      : challengeContext.status === 'ENTRY_OPEN'
        ? getLiveChallengeRecordingCapSec(challengeContext.maxDurationSec)
        : getRecordingMaxDurationSec('standard');

  useEffect(() => {
    if (!challengeSlug) {
      setChallengeContext(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/challenges/${encodeURIComponent(challengeSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !data?.challenge) {
          setChallengeContext(null);
          setError('Invalid challenge link. Please return to the challenge page and try again.');
          return;
        }
        setChallengeContext({
          slug: data.challenge.slug,
          title: data.challenge.title,
          status: data.challenge.status,
          maxDurationSec:
            typeof data.challenge.maxDurationSec === 'number'
              ? data.challenge.maxDurationSec
              : getRecordingMaxDurationSec('live'),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setChallengeContext(null);
          setError('Could not load challenge details right now. Please try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [challengeSlug]);

  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileSelect = useCallback((f: File, sec: number) => {
    setFile(f);
    setDurationSec(sec);
    setError('');
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setDurationSec(0);
    setError('');
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError(t('upload.errorChooseFile'));
      return;
    }
    if (!title.trim()) {
      setError(t('upload.errorTitleRequired'));
      return;
    }
    if (!styleSlug) {
      setError(t('upload.errorChooseStyle'));
      return;
    }
    if (!rulesAcknowledged) {
      setError('Please confirm the platform rules (real performance, no playback, no lip-sync).');
      return;
    }
    if (challengeSlug && challengeContext && challengeContext.status !== 'ENTRY_OPEN') {
      setError('This challenge is not accepting entries right now.');
      return;
    }
    const mimeType = getMimeTypeForUpload(file);
    if (!mimeType) {
      setError(t('upload.errorInvalidFileType'));
      return;
    }
    if (file.size > MAX_VIDEO_FILE_SIZE) {
      setError(t('upload.errorFileTooLarge'));
      return;
    }
    const sec = durationSec >= 1 ? durationSec : 1;
    if (sec < 1) {
      setError('Could not read video duration. Try another file.');
      return;
    }
    if (sec > maxStudioDurationSec) {
      setError(
        `This performance is longer than the maximum allowed (${maxStudioDurationSec}s). Trim or record a shorter take.`
      );
      return;
    }

    setPhase('uploading');
    setUploadProgress(0);

    try {
      const result = await performDirectUpload(
        file,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          categorySlug: styleSlug,
          durationSec: sec,
          contentType,
          commentPermission,
          ...(hasChallengeSlug ? { challengeSlug } : {}),
        },
        {
          onProgress: setUploadProgress,
          onStatus: setUploadStep,
        }
      );

      if (!result.ok) {
        if (result.message === 'Login required') {
          const backTo = challengeSlug ? `/upload?challenge=${encodeURIComponent(challengeSlug)}` : '/upload';
          router.push(`/login?from=${encodeURIComponent(backTo)}`);
          return;
        }
        setPhase('failed');
        setError(toUiUploadError(result.message));
        return;
      }

      if (challengeSlug) {
        const enterRes = await fetch(`/api/challenges/${encodeURIComponent(challengeSlug)}/enter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: result.videoId, styleSlug }),
        });
        const enterData = await enterRes.json();
        if (!enterRes.ok || !enterData?.ok) {
          setPhase('failed');
          setError('Your upload finished, but challenge submission could not be completed. Please try again.');
          return;
        }
      }

      setPhase('success');
      setSuccessVideoId(result.videoId);
      setSuccessReady(result.ready);
      router.refresh();
    } catch (err) {
      // Keep details in console for debugging while UI stays clean.
      console.error('[upload] publish failed', err);
      setPhase('failed');
      setError('Upload failed. Please try again.');
    }
  };

  const handleUploadAnother = useCallback(() => {
    setFile(null);
    setDurationSec(0);
    setError('');
    setPhase('idle');
    setUploadProgress(0);
    setSuccessVideoId(null);
    setSuccessReady(false);
    setUploadEntryMode('studio');
  }, []);

  const onSwitchToDeviceUpload = useCallback(() => {
    setUploadEntryMode('device');
    setFile(null);
    setDurationSec(0);
    setError('');
  }, []);

  const onBackToStudio = useCallback(() => {
    setUploadEntryMode('studio');
    setFile(null);
    setDurationSec(0);
    setError('');
  }, []);

  const onExitCreation = useCallback(() => {
    router.back();
  }, [router]);

  const onStudioAcceptTake = useCallback((accepted: File, sec: number) => {
    setFile(accepted);
    setDurationSec(sec);
    setUploadEntryMode('device');
    setError('');
  }, []);

  const handleTryAgain = useCallback(() => {
    setError('');
    setPhase('idle');
  }, []);

  const loading = phase === 'uploading';
  const canSubmit =
    uploadEntryMode === 'device' &&
    !loading &&
    file &&
    title.trim() &&
    styleSlug &&
    durationSec >= 1 &&
    durationSec <= maxStudioDurationSec &&
    rulesAcknowledged &&
    (!challengeSlug || !challengeContext || challengeContext.status === 'ENTRY_OPEN');
  const showSuccess = phase === 'success' && successVideoId;

  let progressLabel = '';
  if (phase === 'uploading') {
    if (uploadStep === 'preparing') progressLabel = t('upload.preparing');
    else if (uploadStep === 'uploading') progressLabel = t('upload.uploading') + ' ' + uploadProgress + '%';
    else progressLabel = t('upload.processing');
  }

  const formProps = {
    onSubmit: handleSubmit,
    className: 'block w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-40 md:pb-28 min-w-0 overflow-x-hidden',
    style: { backgroundColor: '#0D0D0E' },
  };
  return React.createElement(
    'form',
    formProps,
    React.createElement(UploadFormContent, {
      showSuccess: Boolean(showSuccess),
      successReady,
      successVideoId,
      t,
      handleUploadAnother,
      loading,
      canSubmit: Boolean(canSubmit),
      progressLabel,
      error,
      phase,
      handleTryAgain,
      title,
      setTitle,
      description,
      setDescription,
      styleSlug,
      setStyleSlug,
      challengeId,
      setChallengeId,
      challengeContext,
      contentType,
      setContentType,
    commentPermission,
    setCommentPermission,
      rulesAcknowledged,
      setRulesAcknowledged,
      file,
      previewUrlStable,
      durationSec,
      uploadSource,
      handleFileSelect,
      handleClearFile,
      setDurationSec,
      uploadStep,
      uploadProgress,
      uploadEntryMode,
      maxStudioDurationSec,
      studioRecordingMode,
      challengeSlug,
      onSwitchToDeviceUpload,
      onBackToStudio,
      onExitCreation,
      onStudioAcceptTake,
    })
  );
}
