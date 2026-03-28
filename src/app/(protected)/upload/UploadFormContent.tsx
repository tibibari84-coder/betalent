'use client';

import { useEffect, useState } from 'react';
import UploadDropzone from '@/components/upload/UploadDropzone';
import LibraryVideoInlinePicker from '@/components/upload/LibraryVideoInlinePicker';
import RecordingStudio from '@/components/studio/RecordingStudio';
import PublishSuccessCard from '@/components/upload/PublishSuccessCard';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import { IconArrowLeft, IconUpload } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { VOCAL_STYLES_UPLOAD } from '@/constants/categories';
import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE, UPLOAD_SOURCE_FILE } from '@/constants/upload';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_DESCRIPTIONS, PLATFORM_RULES_ACKNOWLEDGMENT } from '@/constants/platform-rules';
import type { UploadProgressStep } from '@/lib/upload-client';
import type { RecordingMode } from '@/constants/recording-modes';

const inputClass =
  'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px] min-h-[48px]';

const labelClass = 'block text-[14px] font-medium text-text-primary mb-2';

const captionInputClass =
  'w-full min-h-[120px] resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-[16px] leading-relaxed text-white placeholder:text-white/35 focus:border-accent/35 focus:outline-none focus:ring-1 focus:ring-accent/30';

export type UploadFormPhase = 'idle' | 'uploading' | 'success' | 'failed';
type ChallengeContext = {
  slug: string;
  title: string;
  status: string;
};

export type UploadEntryMode = 'studio' | 'device';

export type Props = {
  showSuccess: boolean;
  successReady: boolean;
  successVideoId: string | null;
  t: (key: string) => string;
  handleUploadAnother: () => void;
  loading: boolean;
  canSubmit: boolean;
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
  contentType: 'ORIGINAL' | 'COVER' | 'REMIX';
  setContentType: (value: 'ORIGINAL' | 'COVER' | 'REMIX') => void;
  commentPermission: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  setCommentPermission: (value: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF') => void;
  rulesAcknowledged: boolean;
  setRulesAcknowledged: (value: boolean) => void;
  file: File | null;
  previewUrlStable: string | null;
  durationSec: number;
  uploadSource: string;
  handleFileSelect: (f: File, sec: number) => void;
  handleClearFile: () => void;
  setDurationSec: (value: number) => void;
  uploadStep: UploadProgressStep;
  uploadProgress: number;
  uploadEntryMode: UploadEntryMode;
  maxStudioDurationSec: number;
  /** Standard (90s cap) vs live challenge (platform/challenge cap). */
  studioRecordingMode: RecordingMode;
  challengeSlug: string;
  onSwitchToDeviceUpload: () => void;
  onBackToStudio: () => void;
  onExitCreation: () => void;
  onStudioAcceptTake: (file: File, durationSec: number) => void;
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

  const dropzoneError =
    file && durationSec > maxStudioDurationSec
      ? `Video is ${durationSec}s — maximum allowed is ${maxStudioDurationSec}s.`
      : file && !getMimeTypeForUpload(file)
        ? 'Use MP4, MOV, M4V, or WebM'
        : file && file.size > MAX_VIDEO_FILE_SIZE
          ? `Max ${Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024)} MB`
          : null;

  if (!showSuccess && uploadEntryMode === 'studio') {
    return (
      <div className="fixed inset-0 z-[100] min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain bg-black [-webkit-overflow-scrolling:touch]">
        <RecordingStudio
          maxDurationSec={maxStudioDurationSec}
          mode={studioRecordingMode}
          challengeSlug={challengeSlug}
          challengeContext={challengeLite}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          styleSlug={styleSlug}
          setStyleSlug={setStyleSlug}
          challengeId={challengeId}
          setChallengeId={setChallengeId}
          contentType={contentType}
          setContentType={setContentType}
          rulesAcknowledged={rulesAcknowledged}
          setRulesAcknowledged={setRulesAcknowledged}
          t={t}
          loading={loading}
          onClose={onExitCreation}
          onSwitchToDeviceUpload={onSwitchToDeviceUpload}
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
            styleLabel={styleSlug ? VOCAL_STYLES_UPLOAD.find((s) => s.slug === styleSlug)?.name ?? styleSlug : ''}
            durationSec={durationSec}
            onUploadAnother={handleUploadAnother}
          />
        </div>
      ) : (
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
              {uploadSource === UPLOAD_SOURCE_FILE &&
                (file ? (
                  <UploadDropzone
                    composer
                    file={file}
                    previewUrl={previewUrlStable}
                    durationSec={durationSec}
                    onFileSelect={handleFileSelect}
                    onClear={handleClearFile}
                    onDurationLoaded={setDurationSec}
                    disabled={loading}
                    error={dropzoneError}
                  />
                ) : (
                  <LibraryVideoInlinePicker
                    onFileSelect={handleFileSelect}
                    onDurationLoaded={setDurationSec}
                    onBackToStudio={onBackToStudio}
                    disabled={loading}
                  />
                ))}
              {challengeContext ? (
                <div className="rounded-xl border border-accent/25 bg-accent/[0.08] px-3.5 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/80">Challenge</p>
                  <p className="mt-0.5 text-[14px] font-medium text-white">{challengeContext.title}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{t('upload.vocalStyle')}</p>
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
              <p className="text-[11px] leading-relaxed text-white/30">
                First line can be your performance title. Hashtags and @mentions are OK in the caption when supported.
              </p>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <input
                  type="checkbox"
                  checked={rulesAcknowledged}
                  onChange={(e) => setRulesAcknowledged(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
                />
                <span className="text-[12px] leading-snug text-white/55">{PLATFORM_RULES_ACKNOWLEDGMENT}</span>
              </label>

              <div className="border-t border-white/[0.06] pt-3">
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
                        className={inputClass}
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="contentType" className="mb-1.5 block text-[12px] text-white/45">
                        Content type
                      </label>
                      <select
                        id="contentType"
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value as 'ORIGINAL' | 'COVER' | 'REMIX')}
                        className={inputClass}
                        disabled={loading}
                      >
                        {(['ORIGINAL', 'COVER', 'REMIX'] as const).map((k) => (
                          <option key={k} value={k}>
                            {CONTENT_TYPE_LABELS[k]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-white/35">{CONTENT_TYPE_DESCRIPTIONS[contentType]}</p>
                    </div>
                    <div>
                      <label htmlFor="commentPermission" className="mb-1.5 block text-[12px] text-white/45">
                        Comments
                      </label>
                      <select
                        id="commentPermission"
                        value={commentPermission}
                        onChange={(e) =>
                          setCommentPermission(e.target.value as 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF')
                        }
                        className={inputClass}
                        disabled={loading}
                      >
                        <option value="EVERYONE">Everyone</option>
                        <option value="FOLLOWERS">Followers only</option>
                        <option value="FOLLOWING">People I follow</option>
                        <option value="OFF">Off</option>
                      </select>
                    </div>
                    {file ? (
                      <div className="border-t border-white/[0.08] pt-4">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            handleClearFile();
                            setMoreOpen(false);
                          }}
                          className="min-h-[44px] w-full rounded-xl border border-red-500/35 bg-red-500/[0.08] px-4 py-2.5 text-left text-[13px] font-medium text-red-300/95 transition-colors enabled:[@media(hover:hover)]:hover:border-red-500/50 enabled:[@media(hover:hover)]:hover:bg-red-500/[0.12] disabled:opacity-45"
                        >
                          {t('upload.deleteVideo')}
                        </button>
                        <p className="mt-2 text-[11px] leading-relaxed text-white/35">{t('upload.deleteVideoHint')}</p>
                      </div>
                    ) : null}
                    <p className="text-[11px] leading-relaxed text-white/35">
                      Visibility is public by default for new performances. Votes and gifts follow platform rules for your account tier.
                    </p>
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
              background: 'rgba(6,6,8,0.92)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="mx-auto w-full sm:max-w-md">
              {phase === 'uploading' ? (
                <div className="mb-3" role="region" aria-label="Upload progress">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={uploadStep === 'uploading' ? uploadProgress : uploadStep === 'processing' ? 100 : 10}
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
                className="btn-primary flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:pointer-events-none disabled:opacity-45"
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
