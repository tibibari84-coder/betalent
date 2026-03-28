'use client';

/**
 * Creator publish: Recording Studio → File from blob → performDirectUpload (camera-first only).
 * Uses mounted state to defer searchParams read and avoid hydration mismatch.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UploadProgressStep } from '@/lib/upload-client';
import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';
import type { RecordingMode } from '@/constants/recording-modes';
import {
  getLiveChallengeRecordingCapSec,
  getRecordingMaxDurationSec,
  LIVE_RECORDING_MAX_DURATION_SEC,
} from '@/constants/recording-modes';
import { performDirectUpload } from '@/lib/upload-client';
import { showBetalentToast } from '@/lib/betalent-toast';
import { logUploadFlowEvent, writePostPublishHandoff } from '@/lib/upload-flow-log';
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
  if (raw.includes('upload blocked:') && raw.includes('cors')) {
    return (message ?? '').trim();
  }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError(t('upload.errorChooseFile'));
      return;
    }
    const effectiveTitle =
      title.trim() ||
      description
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean)
        ?.slice(0, 150)
        .trim() ||
      '';
    if (!effectiveTitle) {
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

    logUploadFlowEvent('publish_clicked', { challengeSlug: challengeSlug || undefined });
    setPhase('uploading');
    setUploadProgress(0);

    try {
      logUploadFlowEvent('upload_started', { size: file.size });
      const result = await performDirectUpload(
        file,
        {
          title: effectiveTitle,
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
          logUploadFlowEvent('upload_failed', { reason: 'login_required' });
          const backTo = challengeSlug ? `/upload?challenge=${encodeURIComponent(challengeSlug)}` : '/upload';
          router.push(`/login?from=${encodeURIComponent(backTo)}`);
          return;
        }
        const msg = toUiUploadError(result.message);
        logUploadFlowEvent('upload_failed', {
          reason: result.step ?? 'upload',
          message: result.message,
          code: 'code' in result ? result.code : undefined,
        });
        setPhase('failed');
        setError(msg);
        showBetalentToast({
          message: 'Upload failed — tap to retry',
          durationMs: 0,
          variant: 'error',
          actionLabel: 'Retry',
          onAction: () => {
            setPhase('idle');
            setError('');
          },
        });
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
          logUploadFlowEvent('upload_failed', { reason: 'challenge_enter', videoId: result.videoId });
          setPhase('failed');
          setError('Your upload finished, but challenge submission could not be completed. Please try again.');
          showBetalentToast({
            message: 'Upload failed — tap to retry',
            durationMs: 0,
            variant: 'error',
            actionLabel: 'Retry',
            onAction: () => {
              setPhase('idle');
              setError('');
            },
          });
          return;
        }
      }

      setTitle(effectiveTitle);
      logUploadFlowEvent('upload_completed', { videoId: result.videoId, ready: result.ready });
      logUploadFlowEvent('upload_background', {
        videoId: result.videoId,
        note: 'navigate_while_server_may_finish_processing',
      });
      writePostPublishHandoff({
        videoId: result.videoId,
        ready: result.ready,
        at: Date.now(),
      });
      showBetalentToast({
        message: 'Uploading…',
        durationMs: 4500,
        variant: 'info',
      });
      logUploadFlowEvent('redirected_to_feed', { videoId: result.videoId });
      router.replace('/feed');
      router.refresh();
    } catch (err) {
      console.error('[upload] publish failed', err);
      logUploadFlowEvent('upload_failed', { reason: 'exception' });
      setPhase('failed');
      setError('Upload failed. Please try again.');
      showBetalentToast({
        message: 'Upload failed — tap to retry',
        durationMs: 0,
        variant: 'error',
        actionLabel: 'Retry',
        onAction: () => {
          setPhase('idle');
          setError('');
        },
      });
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
    setUploadEntryMode('publish');
    setError('');
  }, []);

  const handleTryAgain = useCallback(() => {
    setError('');
    setPhase('idle');
  }, []);

  const loading = phase === 'uploading';
  const derivedTitleForGate =
    title.trim() ||
    description
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 150)
      .trim() ||
    '';
  const canSubmit =
    uploadEntryMode === 'publish' &&
    !loading &&
    file &&
    Boolean(derivedTitleForGate) &&
    styleSlug &&
    durationSec >= 1 &&
    durationSec <= maxStudioDurationSec &&
    rulesAcknowledged &&
    (!challengeSlug || !challengeContext || challengeContext.status === 'ENTRY_OPEN');

  /** Why Publish stays disabled (most often: no vocal style selected — button uses pointer-events-none). */
  const publishGateHints = useMemo(() => {
    if (uploadEntryMode !== 'publish' || !file || loading || canSubmit) return [];
    const hints: string[] = [];
    if (!derivedTitleForGate) hints.push(t('upload.errorTitleRequired'));
    if (!styleSlug) hints.push(t('upload.errorChooseStyle'));
    if (!rulesAcknowledged) hints.push(t('upload.hintAcknowledgeRules'));
    if (durationSec < 1 || durationSec > maxStudioDurationSec) hints.push(t('upload.hintDurationOutOfRange'));
    if (challengeSlug && challengeContext && challengeContext.status !== 'ENTRY_OPEN') {
      hints.push(t('upload.hintChallengeNotOpen'));
    }
    return hints;
  }, [
    uploadEntryMode,
    file,
    loading,
    canSubmit,
    derivedTitleForGate,
    styleSlug,
    rulesAcknowledged,
    durationSec,
    maxStudioDurationSec,
    challengeSlug,
    challengeContext,
    t,
  ]);

  const showSuccess = phase === 'success' && successVideoId;

  let progressLabel = '';
  if (phase === 'uploading') {
    if (uploadStep === 'preparing') progressLabel = t('upload.preparing');
    else if (uploadStep === 'uploading') progressLabel = t('upload.uploading') + ' ' + uploadProgress + '%';
    else progressLabel = t('upload.processing');
  }

  const formProps = {
    onSubmit: handleSubmit,
    className:
      'block w-full min-h-0 min-w-0 overflow-x-hidden pb-[calc(7.75rem+env(safe-area-inset-bottom,0px))] scroll-pb-[calc(7.75rem+env(safe-area-inset-bottom,0px))] md:pb-32 md:scroll-pb-28 min-h-[calc(100dvh_-_var(--topbar-height)_-_var(--shell-content-gap-mobile))] md:min-h-[calc(100dvh_-_var(--topbar-height)_-_var(--shell-content-gap-desktop))]',
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
      publishGateHints,
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
      setDurationSec,
      uploadStep,
      uploadProgress,
      uploadEntryMode,
      maxStudioDurationSec,
      studioRecordingMode,
      challengeSlug,
      onBackToStudio,
      onExitCreation,
      onStudioAcceptTake,
    })
  );
}
