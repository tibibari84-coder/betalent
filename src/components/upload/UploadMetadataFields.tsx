'use client';

import { useEffect } from 'react';
import { VOCAL_STYLES_UPLOAD } from '@/constants/categories';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_DESCRIPTIONS, PLATFORM_RULES_ACKNOWLEDGMENT } from '@/constants/platform-rules';

const inputClass =
  'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px] min-h-[48px]';
const labelClass = 'block text-[14px] font-medium text-text-primary mb-2';

export type ChallengeContextLite = {
  slug: string;
  title: string;
  status: string;
} | null;

export type UploadMetadataFieldsProps = {
  disabled: boolean;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  styleSlug: string;
  setStyleSlug: (v: string) => void;
  challengeId: string;
  setChallengeId: (v: string) => void;
  challengeContext: ChallengeContextLite;
  contentType: 'ORIGINAL' | 'COVER' | 'REMIX';
  setContentType: (v: 'ORIGINAL' | 'COVER' | 'REMIX') => void;
  rulesAcknowledged: boolean;
  setRulesAcknowledged: (v: boolean) => void;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  vocalStyleLabel: string;
  durationSec?: number;
  /** Optional compact preview line under metadata */
  showSummaryLine?: boolean;
  /** Studio prep: style + rules only; caption/title after record (publish screen). */
  hideTitleAndCaption?: boolean;
};

export default function UploadMetadataFields(props: UploadMetadataFieldsProps) {
  const {
    disabled,
    title,
    setTitle,
    description,
    setDescription,
    styleSlug,
    setStyleSlug,
    setChallengeId,
    challengeContext,
    contentType,
    setContentType,
    rulesAcknowledged,
    setRulesAcknowledged,
    titleLabel,
    titlePlaceholder,
    descriptionLabel,
    descriptionPlaceholder,
    vocalStyleLabel,
    durationSec = 0,
    showSummaryLine,
    hideTitleAndCaption = false,
  } = props;

  /** Regular upload: no picker needed — single implicit choice is “no challenge”. */
  useEffect(() => {
    if (!challengeContext) {
      setChallengeId('');
    }
  }, [challengeContext, setChallengeId]);

  return (
    <div className={hideTitleAndCaption ? 'grid gap-6' : 'grid md:grid-cols-2 gap-6'}>
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
          <label htmlFor="contentType" className={labelClass}>
            Content type
          </label>
          <select
            id="contentType"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as 'ORIGINAL' | 'COVER' | 'REMIX')}
            className={inputClass}
            disabled={disabled}
          >
            {(['ORIGINAL', 'COVER', 'REMIX'] as const).map((k) => (
              <option key={k} value={k}>
                {CONTENT_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-text-muted mt-1">{CONTENT_TYPE_DESCRIPTIONS[contentType]}</p>
        </div>
        <div>
          <label htmlFor="style" className={labelClass}>
            {vocalStyleLabel}
          </label>
          <select
            id="style"
            value={styleSlug}
            onChange={(e) => setStyleSlug(e.target.value)}
            className={inputClass}
            required
            aria-required
            disabled={disabled}
          >
            <option value="">Select vocal style</option>
            {VOCAL_STYLES_UPLOAD.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-text-muted mt-1">Style of your vocal performance</p>
        </div>
        {!hideTitleAndCaption ? (
          <div>
            <label htmlFor="title" className={labelClass}>
              {titleLabel}
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              className={inputClass}
              required
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>
      {!hideTitleAndCaption ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className={labelClass}>
              {descriptionLabel}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={descriptionPlaceholder}
              className={`${inputClass} min-h-[140px] py-3 resize-none`}
              rows={5}
              disabled={disabled}
            />
          </div>
          {showSummaryLine && (
            <div className="glass-panel glass-panel-card p-4 space-y-2">
              <p className="text-[13px] font-medium text-text-secondary">Preview</p>
              <p className="text-[13px] text-text-muted">
                {title || '—'} ·{' '}
                {styleSlug ? VOCAL_STYLES_UPLOAD.find((s) => s.slug === styleSlug)?.name ?? styleSlug : '—'}
                {durationSec > 0 && ` · ${durationSec}s`}
              </p>
            </div>
          )}
        </div>
      ) : null}

      <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <p className="text-[12px] font-medium text-text-secondary">Platform rules</p>
        <p className="text-[13px] font-medium text-accent/90">No playback. Submit a real performance.</p>
        <ul className="text-[12px] text-text-muted space-y-1 list-disc list-inside">
          <li>No playback — real performance only</li>
          <li>No lip-sync — submit a real, live performance (your voice must be yours)</li>
          <li>Real performance required</li>
        </ul>
        <p className="text-[12px] text-text-muted">By uploading, you confirm you have rights to this content.</p>
        <p className="text-[12px] text-text-muted">
          Submissions may be reviewed for authenticity and rule compliance.
        </p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={rulesAcknowledged}
            onChange={(e) => setRulesAcknowledged(e.target.checked)}
            disabled={disabled}
            className="mt-1 rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50"
          />
          <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors">
            {PLATFORM_RULES_ACKNOWLEDGMENT}
          </span>
        </label>
      </div>
    </div>
  );
}
