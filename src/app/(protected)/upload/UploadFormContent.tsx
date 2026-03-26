'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import UploadDropzone from '@/components/upload/UploadDropzone';
import RecordingStudio from '@/components/studio/RecordingStudio';
import PublishSuccessCard from '@/components/upload/PublishSuccessCard';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import { IconArrowLeft, IconUpload } from '@/components/ui/Icons';
import { VOCAL_STYLES_UPLOAD } from '@/constants/categories';
import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE, UPLOAD_SOURCE_FILE } from '@/constants/upload';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_DESCRIPTIONS, PLATFORM_RULES_ACKNOWLEDGMENT } from '@/constants/platform-rules';
import type { UploadProgressStep } from '@/lib/upload-client';
import type { RecordingMode } from '@/constants/recording-modes';

const inputClass =
  'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px] min-h-[48px]';

const labelClass = 'block text-[14px] font-medium text-text-primary mb-2';

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

  if (!showSuccess && uploadEntryMode === 'studio') {
    return (
      <div className="mobile-page-column w-full max-w-[960px] py-5 md:py-6 laptop:py-8 min-w-0 pb-40 md:pb-28">
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
      <div className="mobile-page-column w-full max-w-[960px] py-5 md:py-6 laptop:py-8 min-w-0">
        {showSuccess ? (
          <PublishSuccessCard
            successReady={successReady}
            successVideoId={successVideoId}
            previewUrl={previewUrlStable}
            title={title}
            styleLabel={styleSlug ? VOCAL_STYLES_UPLOAD.find((s) => s.slug === styleSlug)?.name ?? styleSlug : ''}
            durationSec={durationSec}
            onUploadAnother={handleUploadAnother}
          />
        ) : (
          <>
        <header className="mb-5 laptop:mb-6">
          <button
            type="button"
            onClick={onBackToStudio}
            className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-text-secondary hover:text-text-primary touch-manipulation min-h-[44px] px-1 -ml-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <IconArrowLeft className="w-4 h-4" aria-hidden />
            Record instead
          </button>
          <h1 className="font-display text-[26px] md:text-[32px] laptop:text-[36px] font-bold text-text-primary leading-tight mb-2">
            {t('upload.title')}
          </h1>
          <p className="text-[14px] laptop:text-[15px] text-text-secondary max-w-[560px]">
            Share your talent with the world. Add your video, fill in the details, and publish.
          </p>
        </header>

        <div className="space-y-6 laptop:space-y-8">
          {uploadSource === UPLOAD_SOURCE_FILE && (
            <UploadDropzone
              file={file}
              previewUrl={previewUrlStable}
              durationSec={durationSec}
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              onDurationLoaded={setDurationSec}
              disabled={loading}
              error={
                file && durationSec > maxStudioDurationSec
                  ? `Video is ${durationSec}s — maximum allowed is ${maxStudioDurationSec}s.`
                  : file && !getMimeTypeForUpload(file)
                    ? 'Use MP4, MOV, M4V, or WebM'
                    : file && file.size > MAX_VIDEO_FILE_SIZE
                      ? `Max ${Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024)} MB`
                      : null
              }
            />
          )}

          {phase === 'uploading' && (
            <div className="rounded-[12px] overflow-hidden bg-canvas-tertiary border border-white/10" role="region" aria-label="Upload progress">
              <div
                className="h-2 bg-white/10 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={uploadStep === 'uploading' ? uploadProgress : uploadStep === 'processing' ? 100 : 10}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressLabel}
              >
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: uploadStep === 'uploading' ? (uploadProgress + '%') : uploadStep === 'processing' ? '100%' : '10%' }}
                />
              </div>
              <p className="text-[13px] font-medium text-text-primary px-4 py-2" aria-live="polite">
                {progressLabel}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {challengeContext ? (
                <div>
                  <label htmlFor="challenge-context" className={labelClass}>
                    Challenge
                  </label>
                  <div
                    id="challenge-context"
                    className="rounded-[12px] border border-accent/30 bg-accent/10 px-4 py-3"
                  >
                    <p className="text-[14px] font-semibold text-white">{challengeContext.title}</p>
                    <p className="mt-1 text-[12px] text-white/70">
                      This upload will be submitted to this challenge automatically.
                    </p>
                  </div>
                </div>
              ) : null}
              <div>
                <label htmlFor="contentType" className={labelClass}>Content type</label>
                <select
                  id="contentType"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as 'ORIGINAL' | 'COVER' | 'REMIX')}
                  className={inputClass}
                  disabled={loading}
                >
                  {(['ORIGINAL', 'COVER', 'REMIX'] as const).map((k) => (
                    <option key={k} value={k}>{CONTENT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
                <p className="text-[12px] text-text-muted mt-1">{CONTENT_TYPE_DESCRIPTIONS[contentType]}</p>
              </div>
              <div>
                <label htmlFor="commentPermission" className={labelClass}>Comment permission</label>
                <select
                  id="commentPermission"
                  value={commentPermission}
                  onChange={(e) => setCommentPermission(e.target.value as 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF')}
                  className={inputClass}
                  disabled={loading}
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="FOLLOWERS">Followers only</option>
                  <option value="FOLLOWING">Only people I follow</option>
                  <option value="OFF">Turn comments off</option>
                </select>
                <p className="text-[12px] text-text-muted mt-1">Server-enforced per video.</p>
              </div>
              <div>
                <label htmlFor="style" className={labelClass}>{t('upload.vocalStyle')}</label>
                <select
                  id="style"
                  value={styleSlug}
                  onChange={(e) => setStyleSlug(e.target.value)}
                  className={inputClass}
                  required
                  aria-required
                  disabled={loading}
                >
                  <option value="">Select vocal style</option>
                  {VOCAL_STYLES_UPLOAD.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[12px] text-text-muted mt-1">Style of your vocal performance</p>
              </div>
              <div>
                <label htmlFor="title" className={labelClass}>{t('upload.titleLabel')}</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('upload.titlePlaceholder')}
                  className={inputClass}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className={labelClass}>{t('upload.description')}</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('upload.descriptionPlaceholder')}
                  className={`${inputClass} min-h-[140px] py-3 resize-none`}
                  rows={5}
                  disabled={loading}
                />
              </div>
              <div className="glass-panel glass-panel-card p-4 space-y-2">
                <p className="text-[13px] font-medium text-text-secondary">Preview</p>
                <p className="text-[13px] text-text-muted">
                  {title || '—'} · {styleSlug ? VOCAL_STYLES_UPLOAD.find((s) => s.slug === styleSlug)?.name ?? styleSlug : '—'}
                  {durationSec > 0 && ` · ${durationSec}s`}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[12px] font-medium text-text-secondary">Platform rules</p>
            <p className="text-[13px] font-medium text-accent/90">No playback. Real performance required.</p>
            <ul className="text-[12px] text-text-muted space-y-1 list-disc list-inside">
              <li>No playback — real performance only</li>
              <li>No lip-sync — your voice must be live</li>
              <li>Real performance required</li>
            </ul>
            <p className="text-[12px] text-text-muted">
              By uploading, you confirm you have rights to this content.
            </p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rulesAcknowledged}
                onChange={(e) => setRulesAcknowledged(e.target.checked)}
                disabled={loading}
                className="mt-1 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
              />
              <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors">
                {PLATFORM_RULES_ACKNOWLEDGMENT}
              </span>
            </label>
          </div>

          {error && <p className="text-accent text-[14px]">{error}</p>}

          {phase === 'failed' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-[13px] text-text-secondary">
                {t('upload.tryAgainHint')}
              </p>
              <button
                type="button"
                onClick={handleTryAgain}
                className="text-[14px] font-medium text-accent shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation px-4 [@media(hover:hover)]:hover:underline"
              >
                {t('upload.tryAgain')}
              </button>
            </div>
          )}

          {(title || styleSlug) && file && (
            <div className="glass-panel glass-panel-card p-4 flex flex-wrap gap-4 min-w-0 overflow-hidden">
              <span className="text-[13px] text-text-secondary truncate min-w-0 max-w-full">
                <strong className="text-text-primary">Ready to publish:</strong>{' '}
                {title || '—'} · {styleSlug ? VOCAL_STYLES_UPLOAD.find((s) => s.slug === styleSlug)?.name ?? styleSlug : '—'}
                {durationSec > 0 && ` · ${durationSec}s`}
              </span>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {!showSuccess && uploadEntryMode === 'device' && (
      <>
        <div
          className="hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(255,255,255,0.08)] pt-6 pb-8"
          style={{
            background: 'rgba(26,26,28,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="w-full max-w-[960px] mx-auto px-4 md:px-6 laptop:px-8 flex flex-col sm:flex-row gap-3 min-w-0">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] touch-manipulation px-6 py-3 rounded-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(26,26,28,0.95)]"
            >
              <IconUpload className="w-5 h-5" />
              {loading ? progressLabel || t('upload.uploading') : t('upload.publish')}
            </button>
          </div>
        </div>

        <div className="md:hidden fixed bottom-[68px] left-0 right-0 z-40 p-4 border-t border-[rgba(255,255,255,0.08)]" style={{ background: 'rgba(26,26,28,0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] touch-manipulation py-3 rounded-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
            >
              <IconUpload className="w-5 h-5" />
              {loading ? (progressLabel || t('upload.uploading')) : t('upload.publishShort')}
            </button>
          </div>
        </div>
      </>
      )}
    </>
  );
}
