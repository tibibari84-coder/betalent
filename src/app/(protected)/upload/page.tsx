'use client';

/**
 * Creator publish: Recording Studio → File from blob → performDirectUpload.
 * Pipeline: INIT (POST /api/upload/init) → PUT presigned URL → FINALIZE (POST /api/videos/upload/complete).
 * Uses mounted state to defer searchParams read and avoid hydration mismatch.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ContentTypeUpload, UploadPipelineStep } from '@/lib/upload-client';
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
import type { UploadPagePhase } from './upload-phase';

type ChallengeContext = {
  slug: string;
  title: string;
  status: string;
  maxDurationSec: number;
};

function toUiUploadError(message: string | undefined, step?: string): string {
  const raw = (message ?? '').toLowerCase();
  if (step === 'put') {
    return (
      (message ?? '').trim() ||
      'Could not finish uploading to storage. Check your connection and tap Publish again — we retry automatically once.'
    );
  }
  if (step === 'init') {
    if (raw.includes('login') || raw.includes('verify')) return (message ?? '').trim() || 'Sign in or verify email to publish.';
    return (message ?? '').trim() || 'Could not start upload. Please try again.';
  }
  if (step === 'complete' || step === 'process') {
    return (
      (message ?? '').trim() ||
      'Upload reached the server but finishing failed. Open My videos — your file may still appear shortly.'
    );
  }
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

function deriveContentType(coverArtist: string, coverSong: string): ContentTypeUpload {
  return coverArtist || coverSong ? 'COVER' : 'ORIGINAL';
}

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [description, setDescription] = useState('');
  const [styleSlug, setStyleSlug] = useState('');
  const [coverOriginalArtistName, setCoverOriginalArtistName] = useState('');
  const [coverSongTitle, setCoverSongTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<UploadPagePhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadPipelineStep>('initializing');
  const [challengeContext, setChallengeContext] = useState<ChallengeContext | null>(null);
  const [uploadEntryMode, setUploadEntryMode] = useState<UploadEntryMode>('studio');

  useEffect(() => setMounted(true), []);
  const challengeSlug = mounted ? (searchParams?.get('challenge')?.trim() ?? '') : '';

  const previewUrlStable = file && previewUrl ? previewUrl : null;
  const hasChallengeSlug = Boolean(challengeSlug);

  const isLiveChallengeStudio: boolean = Boolean(
    challengeSlug && challengeContext && challengeContext.status === 'ENTRY_OPEN'
  );
  const studioRecordingMode: RecordingMode = isLiveChallengeStudio ? 'live' : 'standard';

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
    if (!styleSlug) {
      setError(t('upload.errorChooseStyle'));
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

    const captionFirst =
      description
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean)
        ?.slice(0, 150)
        .trim() ?? '';
    const effectiveTitle = captionFirst || 'New performance';
    const coverArtist = coverOriginalArtistName.trim();
    const coverSong = coverSongTitle.trim();
    const contentType = deriveContentType(coverArtist, coverSong);

    logUploadFlowEvent('publish_clicked', { challengeSlug: challengeSlug || undefined });
    setPhase('initializing');
    setUploadStep('initializing');
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
          commentPermission: 'EVERYONE',
          ...(hasChallengeSlug ? { challengeSlug } : {}),
          ...(contentType === 'COVER'
            ? {
                coverOriginalArtistName: coverArtist || undefined,
                coverSongTitle: coverSong || undefined,
              }
            : {}),
        },
        {
          onProgress: setUploadProgress,
          onStatus: (step) => {
            setUploadStep(step);
            setPhase(step);
          },
        }
      );

      if (!result.ok) {
        if (result.message === 'Login required') {
          logUploadFlowEvent('upload_failed', { reason: 'login_required' });
          const backTo = challengeSlug ? `/upload?challenge=${encodeURIComponent(challengeSlug)}` : '/upload';
          router.push(`/login?from=${encodeURIComponent(backTo)}`);
          return;
        }
        const msg = toUiUploadError(result.message, result.step);
        logUploadFlowEvent('upload_failed', {
          reason: result.step ?? 'upload',
          message: result.message,
          code: 'code' in result ? result.code : undefined,
        });
        setPhase('error');
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
          setPhase('error');
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
      setPhase('done');
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
      setPhase('error');
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

  const onBackToStudio = useCallback(() => {
    setUploadEntryMode('studio');
    setFile(null);
    setDurationSec(0);
    setError('');
  }, []);

  const onExitCreation = useCallback(() => {
    router.back();
  }, [router]);

  const onStudioAcceptTake = useCallback((accepted: File, sec: number, meta?: { caption?: string }) => {
    setFile(accepted);
    setDurationSec(sec);
    if (meta?.caption) setDescription(meta.caption);
    setUploadEntryMode('publish');
    setError('');
  }, []);

  const handleTryAgain = useCallback(() => {
    setError('');
    setPhase('idle');
  }, []);

  const pipelineBusy =
    phase === 'initializing' || phase === 'uploading' || phase === 'finalizing';

  const canSubmit =
    uploadEntryMode === 'publish' &&
    !pipelineBusy &&
    file &&
    Boolean(styleSlug) &&
    durationSec >= 1 &&
    durationSec <= maxStudioDurationSec &&
    (!challengeSlug || !challengeContext || challengeContext.status === 'ENTRY_OPEN');

  const publishGateHints = useMemo(() => {
    if (uploadEntryMode !== 'publish' || !file || pipelineBusy || canSubmit) return [];
    const hints: string[] = [];
    if (!styleSlug) hints.push(t('upload.errorChooseStyle'));
    if (durationSec < 1 || durationSec > maxStudioDurationSec) hints.push(t('upload.hintDurationOutOfRange'));
    if (challengeSlug && challengeContext && challengeContext.status !== 'ENTRY_OPEN') {
      hints.push(t('upload.hintChallengeNotOpen'));
    }
    return hints;
  }, [
    uploadEntryMode,
    file,
    pipelineBusy,
    canSubmit,
    styleSlug,
    durationSec,
    maxStudioDurationSec,
    challengeSlug,
    challengeContext,
    t,
  ]);

  let progressLabel = '';
  if (pipelineBusy) {
    if (uploadStep === 'initializing') progressLabel = t('upload.preparing');
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
      t,
      loading: pipelineBusy,
      canSubmit: Boolean(canSubmit),
      publishGateHints,
      progressLabel,
      error,
      phase,
      handleTryAgain,
      description,
      setDescription,
      styleSlug,
      setStyleSlug,
      challengeContext,
      coverOriginalArtistName,
      setCoverOriginalArtistName,
      coverSongTitle,
      setCoverSongTitle,
      file,
      previewUrlStable,
      durationSec,
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
