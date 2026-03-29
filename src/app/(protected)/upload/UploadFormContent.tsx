'use client';

import { useEffect, useMemo, useState } from 'react';
import RecordingStudio from '@/components/studio/RecordingStudio';
import PublishSuccessCard from '@/components/upload/PublishSuccessCard';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import { IconArrowLeft, IconUpload } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { VOCAL_STYLE_CATALOG, vocalStyleLabelForSlug } from '@/constants/vocal-style-catalog';
import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';
import {
  CONTENT_TYPE_LABELS,
  PLATFORM_RULES_ACKNOWLEDGMENT,
  type ContentTypeKey,
} from '@/constants/platform-rules';
import type { UploadProgressStep } from '@/lib/upload-client';
import type { RecordingMode } from '@/constants/recording-modes';

const captionClass =
  'w-full min-h-[112px] resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-[16px] leading-relaxed text-white placeholder:text-white/35 focus:border-accent/35 focus:outline-none focus:ring-1 focus:ring-accent/30';

const chipBase =
  'shrink-0 rounded-full border px-3.5 py-2.5 text-[13px] font-medium transition-colors min-h-[44px]';

export type UploadFormPhase = 'idle' | 'uploading' | 'success' | 'failed';
type ChallengeContext = {
  slug: string;
  title: string;
  status: string;
};

export type UploadEntryMode = 'studio' | 'publish';

const PRIMARY_CONTENT_TYPES: ContentTypeKey[] = [
  'ORIGINAL',
  'COVER',
  'FREESTYLE',
  'DUET',
  'OTHER',
  'REMIX',
];

const COMMENT_PRESETS_MAIN: Array<{
  value: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  label: string;
}> = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FOLLOWERS', label: 'Followers only' },
  { value: 'FOLLOWING', label: 'People I follow' },
  { value: 'OFF', label: 'No comments' },
];

export type Props = {
  showSuccess: boolean;
  successReady: boolean;
  successVideoId: string | null;
  t: (key: string) => string;
  handleUploadAnother: () => void;
  loading: boolean;
  canSubmit: boolean;
  publishGateHints: string[];
  progressLabel: string;
  error: string;
  phase: UploadFormPhase;
  handleTryAgain: () => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  styleSlug: string;
  setStyleSlug: (value: string) => void;
  challengeId: string;
  setChallengeId: (value: string) => void;
  challengeContext: ChallengeContext | null;
  contentType: ContentTypeKey;
  setContentType: (value: ContentTypeKey) => void;
  commentPermission: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  setCommentPermission: (value: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF') => void;
  rulesAcknowledged: boolean;
  setRulesAcknowledged: (value: boolean) => void;
  file: File | null;
  previewUrlStable: string | null;
  durationSec: number;
  setDurationSec: (value: number) => void;
  uploadStep: UploadProgressStep;
  uploadProgress: number;
  uploadEntryMode: UploadEntryMode;
  maxStudioDurationSec: number;
  studioRecordingMode: RecordingMode;
  challengeSlug: string;
  onBackToStudio: () => void;
  onExitCreation: () => void;
  onStudioAcceptTake: (file: File, durationSec: number, meta?: { caption?: string }) => void;
};

export default function UploadFormContent(props: Props) {
  const {
    showSuccess,
    successReady,
    successVideoId,
    t,
    handleUploadAnother,
    loading,
    canSubmit,
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
    challengeId: _challengeId,
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
    setDurationSec: _setDurationSec,
    uploadStep,
    uploadProgress,
    uploadEntryMode,
    maxStudioDurationSec,
    studioRecordingMode,
    challengeSlug,
    onBackToStudio,
    onExitCreation,
    onStudioAcceptTake,
  } = props;

  const challengeLite: ChallengeContextLite = challengeContext
    ? { slug: challengeContext.slug, title: challengeContext.title, status: challengeContext.status }
    : null;

  useEffect(() => {
    if (!challengeContext) {
      setChallengeId('');
    }
  }, [challengeContext, setChallengeId]);

  const [moreOpen, setMoreOpen] = useState(false);
  const [vocalStyles, setVocalStyles] = useState<{ slug: string; name: string }[]>([]);

  /** DB-backed when API returns; else canonical catalog so publish is never blocked on empty UI. */
  const stylesForUi = useMemo(
    () =>
      vocalStyles.length > 0
        ? vocalStyles
        : VOCAL_STYLE_CATALOG.map((c) => ({ slug: c.slug, name: c.name })),
    [vocalStyles]
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories/vocal-styles', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; styles?: { slug: string; name: string }[] }) => {
        if (cancelled || !data?.ok || !Array.isArray(data.styles)) return;
        setVocalStyles(data.styles);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stylesForUi.length && !styleSlug) {
      setStyleSlug(stylesForUi[0].slug);
    }
  }, [stylesForUi, styleSlug, setStyleSlug]);

  const publishVideoError =
    file && durationSec > maxStudioDurationSec
      ? `This take is ${durationSec}s — maximum allowed is ${maxStudioDurationSec}s. Record again with a shorter take.`
      : file && !getMimeTypeForUpload(file)
        ? 'This recording could not be read for upload. Try recording again.'
        : file && file.size > MAX_VIDEO_FILE_SIZE
          ? `Recording is too large (max ${Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024)} MB). Record a shorter take.`
          : null;

  if (!showSuccess && uploadEntryMode === 'studio') {
    return (
      <div className="fixed inset-0 z-[100] h-[100dvh] min-h-0 w-full overflow-hidden overscroll-none bg-black">
        <RecordingStudio
          maxDurationSec={maxStudioDurationSec}
          mode={studioRecordingMode}
          challengeSlug={challengeSlug}
          challengeContext={challengeLite}
          onClose={onExitCreation}
          onAcceptTake={onStudioAcceptTake}
        />
      </div>
    );
  }

  return (
    <>
      {showSuccess ? (
        <div className="w-full min-w-0 px-3 py-6 sm:px-4 md:mx-auto md:max-w-lg md:px-6 md:py-10">
          <PublishSuccessCard
            successReady={successReady}
            successVideoId={successVideoId}
            previewUrl={previewUrlStable}
            title={title}
            styleLabel={styleSlug ? vocalStyleLabelForSlug(styleSlug) : ''}
            durationSec={durationSec}
            onUploadAnother={handleUploadAnother}
          />
        </div>
      ) : (
        <div className="flex w-full min-h-0 flex-col bg-[#0a0a0c]">
          <header className="shrink-0 px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onBackToStudio}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-[15px] font-medium text-white/70 transition-colors [@media(hover:hover)]:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <IconArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
              Back
            </button>
          </header>

          <div className="mx-auto w-full max-w-[420px] flex-1 space-y-5 px-3 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-1">
            {previewUrlStable && file ? (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
                <video
                  src={previewUrlStable}
                  className="aspect-[9/16] w-full object-contain object-center bg-black"
                  controls
                  playsInline
                  preload="metadata"
                />
                <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[11px] text-white/40">
                  {durationSec >= 1 ? `${durationSec}s` : '—'}
                </p>
              </div>
            ) : null}

            {publishVideoError ? (
              <div
                className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 text-[13px] text-amber-100/95"
                role="alert"
              >
                {publishVideoError}
              </div>
            ) : null}

            {challengeContext ? (
              <div className="rounded-2xl border border-accent/25 bg-accent/[0.08] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent/85">Challenge</p>
                <p className="mt-1 text-[15px] font-semibold text-white">{challengeContext.title}</p>
              </div>
            ) : null}

            <div>
              <label htmlFor="caption" className="mb-2 block text-[13px] font-semibold text-white/90">
                Caption
              </label>
              <textarea
                id="caption"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('upload.captionPlaceholder')}
                className={captionClass}
                rows={4}
                disabled={loading}
                autoComplete="off"
                maxLength={2000}
              />
              <p className="mt-1.5 text-[11px] text-white/35">Hashtags and @mentions can go in your caption.</p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                {t('upload.vocalStyle')}
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stylesForUi.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    disabled={loading}
                    onClick={() => setStyleSlug(s.slug)}
                    className={cn(
                      chipBase,
                      'shrink-0',
                      styleSlug === s.slug
                        ? 'border-accent/45 bg-accent/18 text-white shadow-[0_0_0_1px_rgba(196,18,47,0.25)]'
                        : 'border-white/[0.1] bg-white/[0.04] text-white/65 [@media(hover:hover)]:hover:border-white/18'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">Content type</p>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_CONTENT_TYPES.map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={loading}
                    onClick={() => setContentType(k)}
                    className={cn(
                      chipBase,
                      contentType === k
                        ? 'border-accent/45 bg-accent/18 text-white'
                        : 'border-white/[0.1] bg-white/[0.04] text-white/65'
                    )}
                  >
                    {CONTENT_TYPE_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">Comments</p>
              <div className="flex flex-wrap gap-2">
                {COMMENT_PRESETS_MAIN.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() => setCommentPermission(value)}
                    className={cn(
                      chipBase,
                      commentPermission === value
                        ? 'border-accent/45 bg-accent/18 text-white'
                        : 'border-white/[0.1] bg-white/[0.04] text-white/65'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <input
                type="checkbox"
                checked={rulesAcknowledged}
                onChange={(e) => setRulesAcknowledged(e.target.checked)}
                disabled={loading}
                className="mt-0.5 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
              />
              <span className="text-[12px] leading-snug text-white/55">{PLATFORM_RULES_ACKNOWLEDGMENT}</span>
            </label>

            <div className="border-t border-white/[0.06] pt-1">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex w-full min-h-[44px] items-center justify-between rounded-xl px-1 py-2 text-left text-[13px] font-medium text-white/45 transition-colors [@media(hover:hover)]:hover:text-white/70"
                aria-expanded={moreOpen}
              >
                More options
                <span className="text-white/35" aria-hidden>
                  {moreOpen ? '−' : '+'}
                </span>
              </button>
              {moreOpen ? (
                <div className="mt-3 space-y-4 border-t border-white/[0.05] pt-4">
                  <div>
                    <label htmlFor="title-optional" className="mb-1.5 block text-[12px] text-white/45">
                      {t('upload.titleLabel')} <span className="text-white/25">(optional)</span>
                    </label>
                    <input
                      id="title-optional"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('upload.titlePlaceholder')}
                      className="w-full min-h-[48px] rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[16px] text-white placeholder:text-white/35 focus:border-accent/35 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                  {file ? (
                    <div className="border-t border-white/[0.08] pt-4">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setMoreOpen(false);
                          onBackToStudio();
                        }}
                        className="min-h-[44px] w-full rounded-xl border border-red-500/35 bg-red-500/[0.08] px-4 py-2.5 text-left text-[13px] font-medium text-red-300/95 transition-colors enabled:[@media(hover:hover)]:hover:border-red-500/50 enabled:[@media(hover:hover)]:hover:bg-red-500/[0.12] disabled:opacity-45"
                      >
                        Discard take & re-record
                      </button>
                      <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                        You’ll return to the studio. Nothing is published yet.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2.5" role="alert">
                <p className="text-[13px] leading-relaxed text-red-200/95">{error}</p>
                {phase === 'failed' ? (
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    className="mt-2 min-h-[40px] text-[13px] font-semibold text-accent"
                  >
                    {t('upload.tryAgain')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] px-4 pt-3"
            style={{
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
              background: 'rgba(8,8,10,0.94)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="mx-auto w-full max-w-[420px]">
              {publishGateHints.length > 0 ? (
                <div
                  id="publish-gate-hints"
                  className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/[0.1] px-3 py-2.5"
                  role="status"
                >
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                    {t('upload.publishBlockedIntro')}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-amber-50/95">
                    {publishGateHints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {phase === 'uploading' ? (
                <div className="mb-3" role="region" aria-label="Upload progress">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={
                      uploadStep === 'uploading' ? uploadProgress : uploadStep === 'processing' ? 100 : 10
                    }
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={progressLabel}
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{
                        width:
                          uploadStep === 'uploading'
                            ? `${uploadProgress}%`
                            : uploadStep === 'processing'
                              ? '100%'
                              : '12%',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-[12px] font-medium text-white/65" aria-live="polite">
                    {progressLabel}
                  </p>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={!canSubmit || loading}
                aria-describedby={!canSubmit && !loading && publishGateHints.length > 0 ? 'publish-gate-hints' : undefined}
                className="btn-primary flex h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold disabled:pointer-events-none disabled:opacity-45"
              >
                <IconUpload className="h-5 w-5 shrink-0" aria-hidden />
                {loading ? progressLabel || t('upload.uploading') : t('upload.publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
