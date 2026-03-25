'use client';

import { useState, useEffect } from 'react';
import UploadMetadataFields from '@/components/upload/UploadMetadataFields';
import type { ChallengeContextLite } from '@/components/upload/UploadMetadataFields';
import { IconChevronRight } from '@/components/ui/Icons';
import type { RecordingMode } from '@/constants/recording-modes';
import { MAX_PLATFORM_UPLOAD_DURATION_SEC } from '@/constants/upload';
import { isStudioRecordingSupported } from '@/hooks/useStudioRecorder';
import { btnGhost, btnPrimary, studioHeaderBg, studioPanel } from './studio-tokens';
import { getStudioModeCopy } from './studio-mode-copy';

export type StudioSetupStepProps = {
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
  t: (key: string) => string;
  loading: boolean;
  localError: string;
  maxDurationSec: number;
  mode: RecordingMode;
  onEnterBooth: () => void;
  onClose: () => void;
  onSwitchToDeviceUpload: () => void;
};

export default function StudioSetupStep(props: StudioSetupStepProps) {
  const {
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
    rulesAcknowledged,
    setRulesAcknowledged,
    t,
    loading,
    localError,
    maxDurationSec,
    mode,
    onEnterBooth,
    onClose,
    onSwitchToDeviceUpload,
  } = props;
  const copy = getStudioModeCopy(mode);

  // Defer client-only check to avoid hydration mismatch (window/navigator not available on server)
  const [recordingSupported, setRecordingSupported] = useState(false);
  useEffect(() => setRecordingSupported(isStudioRecordingSupported()), []);

  return (
    <div className={`${studioPanel} animate-studio-enter`}>
      <div className={`px-5 py-5 md:px-9 md:py-7 ${studioHeaderBg}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {mode === 'live' && copy.liveChallengeBadge && (
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full border border-accent/45 bg-accent/15 text-accent">
              {copy.liveChallengeBadge}
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-accent/95 font-semibold">{copy.studioLabel}</span>
          <span className="text-white/25 hidden sm:inline" aria-hidden>
            ·
          </span>
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">{copy.prepLabel}</span>
        </div>
        <h2 className="font-display text-[1.65rem] sm:text-[1.85rem] md:text-[2rem] font-bold text-white tracking-tight leading-[1.15]">{copy.prepTitle}</h2>
        <p className="text-[13px] sm:text-[14px] text-white/50 mt-3 max-w-[34rem] leading-relaxed font-body">
          {copy.prepDescription}{' '}
          <span className="text-white/75 tabular-nums">{maxDurationSec}s</span>
          {mode === 'standard' ? ` (platform maximum ${MAX_PLATFORM_UPLOAD_DURATION_SEC}s).` : ''}
        </p>
      </div>

      <div className="p-5 md:p-9 space-y-7 md:space-y-8">
        {mode === 'live' && copy.liveRulesHelper && (
          <div
            className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 sm:px-5 sm:py-4"
            role="note"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-semibold mb-2">Live challenge rules</p>
            <p className="text-[13px] sm:text-[14px] text-white/65 leading-relaxed">{copy.liveRulesHelper}</p>
          </div>
        )}

        <div
          className="relative rounded-[18px] sm:rounded-[20px] border border-accent/20 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(196,18,47,0.1) 0%, rgba(12,10,14,0.92) 55%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(196,18,47,0.06)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold mb-1.5">On-camera standards</p>
            <p className="text-[13px] sm:text-[14px] text-white/70 leading-relaxed">
              Deliver a <strong className="text-white/90 font-semibold">live vocal performance</strong> (no lip-sync, no playback masquerading as live). Submissions may be reviewed for authenticity.
            </p>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-1 sm:p-1.5">
          <UploadMetadataFields
            disabled={loading}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            styleSlug={styleSlug}
            setStyleSlug={setStyleSlug}
            challengeId={challengeId}
            setChallengeId={setChallengeId}
            challengeContext={challengeContext}
            contentType={contentType}
            setContentType={setContentType}
            rulesAcknowledged={rulesAcknowledged}
            setRulesAcknowledged={setRulesAcknowledged}
            titleLabel={t('upload.titleLabel')}
            titlePlaceholder={t('upload.titlePlaceholder')}
            descriptionLabel={t('upload.description')}
            descriptionPlaceholder={t('upload.descriptionPlaceholder')}
            vocalStyleLabel={t('upload.vocalStyle')}
            durationSec={0}
            showSummaryLine={false}
          />
        </div>

        {localError && (
          <div className="rounded-[14px] border border-accent/30 bg-accent/[0.08] px-4 py-3 text-[13px] sm:text-[14px] text-red-200/95 leading-relaxed" role="alert">
            {localError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
          <button
            type="button"
            onClick={onEnterBooth}
            disabled={loading || !recordingSupported}
            className={`${btnPrimary} inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
          >
            Enter live room
            <IconChevronRight className="w-5 h-5 opacity-90 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </button>
          <button type="button" onClick={onClose} disabled={loading} className={`${btnGhost} w-full sm:w-auto justify-center`}>
            Cancel
          </button>
        </div>
        <p className="text-[12px] sm:text-[13px] text-white/50 leading-relaxed max-w-lg">
          {!recordingSupported ? (
            <>This environment doesn&apos;t support in-browser capture. </>
          ) : null}
          <button
            type="button"
            onClick={onSwitchToDeviceUpload}
            disabled={loading}
            className="font-medium text-accent/90 hover:text-accent underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
          >
            Upload from library instead
          </button>
        </p>
      </div>
    </div>
  );
}
