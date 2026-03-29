'use client';

import RecordingStudio from '@/components/studio/RecordingStudio';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import { IconArrowLeft, IconUpload } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { VOCAL_STYLES_UPLOAD } from '@/constants/categories';
import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';
import type { UploadPipelineStep } from '@/lib/upload-client';
import type { RecordingMode } from '@/constants/recording-modes';
import type { UploadPagePhase } from './upload-phase';

const inputClass =
  'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[16px] min-h-[48px]';

const captionInputClass =
  'w-full min-h-[120px] resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-[16px] leading-relaxed text-white placeholder:text-white/35 focus:border-accent/35 focus:outline-none focus:ring-1 focus:ring-accent/30';

export type UploadEntryMode = 'studio' | 'publish';

export type Props = {
  t: (key: string) => string;
  loading: boolean;
  canSubmit: boolean;
  publishGateHints: string[];
  progressLabel: string;
  error: string;
  phase: UploadPagePhase;
  handleTryAgain: () => void;
  description: string;
  setDescription: (value: string) => void;
  styleSlug: string;
  setStyleSlug: (value: string) => void;
  challengeContext: { slug: string; title: string; status: string } | null;
  coverOriginalArtistName: string;
  setCoverOriginalArtistName: (value: string) => void;
  coverSongTitle: string;
  setCoverSongTitle: (value: string) => void;
  file: File | null;
  previewUrlStable: string | null;
  durationSec: number;
  uploadStep: UploadPipelineStep;
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
    t,
    loading,
    canSubmit,
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
  } = props;

  const challengeLite: ChallengeContextLite = challengeContext
    ? { slug: challengeContext.slug, title: challengeContext.title, status: challengeContext.status }
    : null;

  const publishVideoError =
    file && durationSec > maxStudioDurationSec
      ? `This take is ${durationSec}s — maximum allowed is ${maxStudioDurationSec}s. Record again with a shorter take.`
      : file && !getMimeTypeForUpload(file)
        ? 'This recording could not be read for upload. Try recording again.'
        : file && file.size > MAX_VIDEO_FILE_SIZE
          ? `Recording is too large (max ${Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024)} MB). Record a shorter take.`
          : null;

  if (uploadEntryMode === 'studio') {
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

  const pipelineBusy =
    phase === 'initializing' || phase === 'uploading' || phase === 'finalizing';

  const progressBarPercent =
    uploadStep === 'uploading'
      ? uploadProgress
      : uploadStep === 'finalizing'
        ? 100
        : 12;

  return (
    <div className="flex w-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pb-1 pt-[max(6px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBackToStudio}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-1 text-[14px] font-medium text-white/55 transition-colors [@media(hover:hover)]:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <IconArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back
        </button>
      </header>

      <div className="mx-auto w-full space-y-4 px-3 pb-[calc(9.25rem+env(safe-area-inset-bottom))] pt-1 sm:max-w-md sm:px-4 md:space-y-5 md:pb-[calc(9.75rem+env(safe-area-inset-bottom))]">
        {previewUrlStable && file ? (
          <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/[0.1] bg-black">
            <video
              src={previewUrlStable}
              className="aspect-[9/16] w-full object-contain object-center bg-black"
              controls
              playsInline
              preload="metadata"
            />
            <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[12px] text-white/45">
              {durationSec >= 1 ? `${durationSec}s` : '—'} · preview
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
          <div className="rounded-xl border border-accent/25 bg-accent/[0.08] px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/80">Challenge</p>
            <p className="mt-0.5 text-[14px] font-medium text-white">{challengeContext.title}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="description" className="mb-2 block text-[13px] font-semibold text-white/90">
            Caption
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('upload.captionPlaceholder')}
            className={captionInputClass}
            rows={4}
            disabled={loading}
            autoComplete="off"
            aria-label={t('upload.captionPlaceholder')}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            Optional. Hashtags inline — first line becomes the title if you add one.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.1] bg-black/25 p-3">
          <p className="mb-3 text-[12px] font-medium text-white/65">Cover song (optional)</p>
          <div>
            <label htmlFor="cover-artist" className="mb-1.5 block text-[12px] font-medium text-white/55">
              Original artist
            </label>
            <input
              id="cover-artist"
              type="text"
              value={coverOriginalArtistName}
              onChange={(e) => setCoverOriginalArtistName(e.target.value)}
              placeholder="Artist name"
              className={inputClass}
              disabled={loading}
              autoComplete="off"
              maxLength={200}
            />
          </div>
          <div className="mt-3">
            <label htmlFor="cover-song" className="mb-1.5 block text-[12px] font-medium text-white/55">
              Song title
            </label>
            <input
              id="cover-song"
              type="text"
              value={coverSongTitle}
              onChange={(e) => setCoverSongTitle(e.target.value)}
              placeholder="Song title"
              className={inputClass}
              disabled={loading}
              autoComplete="off"
              maxLength={200}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/35">
            Leave blank for an original performance. If you add either field, we mark this as a cover.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{t('upload.vocalStyle')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VOCAL_STYLES_UPLOAD.map((s) => (
              <button
                key={s.slug}
                type="button"
                disabled={loading}
                onClick={() => setStyleSlug(s.slug)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors min-h-[44px]',
                  styleSlug === s.slug
                    ? 'border-accent/45 bg-accent/15 text-white'
                    : 'border-white/[0.1] bg-white/[0.04] text-white/55 [@media(hover:hover)]:hover:border-white/20'
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {file ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onBackToStudio();
            }}
            className="min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-left text-[13px] font-medium text-white/70 transition-colors enabled:[@media(hover:hover)]:hover:bg-white/[0.07] disabled:opacity-45"
          >
            Discard take & re-record
          </button>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2.5" role="alert">
            <p className="text-[13px] leading-relaxed text-red-200/95">{error}</p>
            {phase === 'error' ? (
              <button type="button" onClick={handleTryAgain} className="mt-2 min-h-[40px] text-[13px] font-semibold text-accent">
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
          background: 'rgba(6,6,8,0.92)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="mx-auto w-full sm:max-w-md">
          {publishGateHints.length > 0 ? (
            <div
              id="publish-gate-hints"
              className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/[0.1] px-3 py-2.5"
              role="status"
            >
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                {t('upload.publishBlockedIntro')}
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-amber-50/95">
                {publishGateHints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {pipelineBusy ? (
            <div className="mb-3" role="region" aria-label="Upload progress">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={progressBarPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressLabel}
              >
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progressBarPercent}%` }}
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
            className="btn-primary flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold disabled:pointer-events-none disabled:opacity-45"
          >
            <IconUpload className="h-5 w-5 shrink-0" aria-hidden />
            {loading ? progressLabel || t('upload.uploading') : t('upload.publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
