/**
 * BETALENT AI Vocal Scoring – multi-factor vocal score logic and platform integration.
 *
 * The AI vocal score is ONE input in a balanced ranking system. It does NOT replace
 * audience engagement (super votes, gifts, watch time, likes). Used for:
 * - Fairness and talent identification
 * - Challenge ranking refinement and quality floor (passesChallengeVocalFloor)
 * - Low-quality / abuse filtering (FLAGGED for review; VOCAL_SPAM_FLOOR, VOCAL_QUALITY_FLOOR)
 * - Creator dashboard: getDashboardSummary returns overall, sub-score categories,
 *   strengths (score ≥ 70), areas to improve (score < 50); no raw technical data.
 *
 * Architecture: modular. Actual audio analysis (pitch contour, timing, voice activity,
 * signal clarity, dynamic range, backing dominance) runs in a separate pipeline/worker.
 * Contract: lib/audio-analysis-architecture.ts. This service persists results and
 * exposes them for ranking, challenge, and dashboard.
 */

import { prisma } from '@/lib/prisma';
import type { AudioAnalysisStatus } from '@prisma/client';
import { mapVideoToIntegrityModeration } from '@/lib/video-moderation';
import {
  VOCAL_SCORE_WEIGHTS,
  VOCAL_QUALITY_FLOOR,
  VOCAL_SPAM_FLOOR,
  VOCAL_CHALLENGE_QUALITY_FLOOR,
} from '@/constants/vocal-scoring';
import {
  ANALYSIS_VERSION,
  MAX_ANALYSIS_ATTEMPTS,
  MAX_MEDIA_DURATION_SEC,
  validateMediaUrlForAnalysis,
} from '@/constants/audio-analysis';
import { DUPLICATE_RISK_THRESHOLD } from '@/constants/media-integrity';

export type VocalSubScores = {
  pitchAccuracyScore: number;
  rhythmTimingScore: number;
  toneStabilityScore: number;
  clarityScore: number;
  dynamicControlScore: number;
  performanceConfidenceScore: number;
};

/** 0–100 composite from sub-scores using VOCAL_SCORE_WEIGHTS. */
export function computeOverallFromSubScores(subs: VocalSubScores): number {
  const raw =
    subs.pitchAccuracyScore * VOCAL_SCORE_WEIGHTS.pitchAccuracy +
    subs.rhythmTimingScore * VOCAL_SCORE_WEIGHTS.rhythmTiming +
    subs.toneStabilityScore * VOCAL_SCORE_WEIGHTS.toneStability +
    subs.clarityScore * VOCAL_SCORE_WEIGHTS.clarity +
    subs.dynamicControlScore * VOCAL_SCORE_WEIGHTS.dynamicControl +
    subs.performanceConfidenceScore * VOCAL_SCORE_WEIGHTS.performanceConfidence;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

export function isAboveQualityFloor(overallScore: number): boolean {
  return overallScore >= VOCAL_QUALITY_FLOOR;
}

export function isAboveChallengeFloor(overallScore: number): boolean {
  return overallScore >= VOCAL_CHALLENGE_QUALITY_FLOOR;
}

export function isAboveSpamFloor(overallScore: number): boolean {
  return overallScore >= VOCAL_SPAM_FLOOR;
}

/**
 * Returns normalized vocal score 0–1 for use in ranking, or null if no completed analysis.
 * AI score is one weighted signal among watch time, support, engagement, freshness.
 */
export async function getNormalizedVocalScoreForRanking(videoId: string): Promise<number | null> {
  const a = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
    select: { overallVocalScore: true, analysisStatus: true },
  });
  if (!a || a.analysisStatus !== 'COMPLETED' || a.overallVocalScore == null) return null;
  return a.overallVocalScore / 100;
}

/**
 * Get analysis record for a video. Returns null if none.
 */
export async function getAnalysisForVideo(videoId: string) {
  return prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
  });
}

/**
 * Get or create analysis record. If missing, creates PENDING for later pipeline processing.
 */
export async function getOrCreateAnalysis(videoId: string, styleCategoryId?: string | null) {
  const existing = await prisma.videoAudioAnalysis.findUnique({ where: { videoId } });
  if (existing) return existing;
  return prisma.videoAudioAnalysis.create({
    data: {
      videoId,
      analysisStatus: 'PENDING',
      styleCategoryId: styleCategoryId ?? undefined,
    },
  });
}

/**
 * Atomically claim the next PENDING or retryable job (RETRYABLE_FAILED with attemptCount < max).
 * Transition PENDING -> PROCESSING is atomic; only one worker can claim a given job.
 * Rejects jobs whose video URL is not allowlisted or duration exceeds limit (marks FAILED and returns null).
 */
export async function claimNextPendingJob(): Promise<{
  videoId: string;
  videoUrl: string;
  styleCategoryId: string | null;
  attemptCount: number;
} | null> {
  const next = await prisma.videoAudioAnalysis.findFirst({
    where: {
      OR: [
        { analysisStatus: 'PENDING' },
        {
          analysisStatus: 'RETRYABLE_FAILED',
          attemptCount: { lt: MAX_ANALYSIS_ATTEMPTS },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      videoId: true,
      attemptCount: true,
      video: { select: { videoUrl: true, durationSec: true } },
      styleCategoryId: true,
    },
  });
  if (!next?.video?.videoUrl) return null;

  const videoUrl = next.video.videoUrl;
  const urlCheck = validateMediaUrlForAnalysis(videoUrl);
  if (!urlCheck.allowed) {
    await prisma.videoAudioAnalysis.update({
      where: { videoId: next.videoId },
      data: {
        analysisStatus: 'FAILED',
        lastError: urlCheck.reason,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return null;
  }

  const durationSec = next.video.durationSec ?? null;
  if (durationSec != null && durationSec > MAX_MEDIA_DURATION_SEC) {
    await prisma.videoAudioAnalysis.update({
      where: { videoId: next.videoId },
      data: {
        analysisStatus: 'FAILED',
        lastError: 'MAX_DURATION_EXCEEDED',
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return null;
  }

  const newAttemptCount = next.attemptCount + 1;
  const updated = await prisma.videoAudioAnalysis.updateMany({
    where: {
      id: next.id,
      OR: [
        { analysisStatus: 'PENDING' },
        { analysisStatus: 'RETRYABLE_FAILED', attemptCount: { lt: MAX_ANALYSIS_ATTEMPTS } },
      ],
    },
    data: {
      analysisStatus: 'PROCESSING',
      startedAt: new Date(),
      attemptCount: newAttemptCount,
      lastError: null,
      updatedAt: new Date(),
    },
  });
  if (updated.count === 0) return null;

  return {
    videoId: next.videoId,
    videoUrl,
    styleCategoryId: next.styleCategoryId,
    attemptCount: newAttemptCount,
  };
}

/**
 * Get next job for worker (atomic claim). Use claimNextPendingJob for new flow.
 * @deprecated Prefer claimNextPendingJob for atomic claim + URL allowlist.
 */
export async function getNextPendingForWorker(): Promise<{
  videoId: string;
  videoUrl: string;
  styleCategoryId: string | null;
} | null> {
  const job = await claimNextPendingJob();
  if (!job) return null;
  return { videoId: job.videoId, videoUrl: job.videoUrl, styleCategoryId: job.styleCategoryId };
}

/**
 * Enqueue a video for analysis only if its media URL is in the allowed domains list.
 * Rejects arbitrary public URLs: creates/updates record to FAILED with lastError URL_NOT_ALLOWED and returns.
 */
export async function enqueueAnalysis(videoId: string): Promise<{ enqueued: boolean; reason?: string }> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, categoryId: true, videoUrl: true },
  });
  if (!video) return { enqueued: false, reason: 'VIDEO_NOT_FOUND' };
  if (!video.videoUrl) return { enqueued: false, reason: 'URL_EMPTY' };
  const urlCheck = validateMediaUrlForAnalysis(video.videoUrl);
  if (!urlCheck.allowed) {
    await prisma.videoAudioAnalysis.upsert({
      where: { videoId },
      create: {
        videoId,
        analysisStatus: 'FAILED',
        lastError: urlCheck.reason,
        finishedAt: new Date(),
      },
      update: {
        analysisStatus: 'FAILED',
        lastError: urlCheck.reason,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { enqueued: false, reason: urlCheck.reason };
  }
  await getOrCreateAnalysis(videoId, video.categoryId);
  return { enqueued: true };
}

/**
 * Save analysis result from pipeline. Idempotent: only updates if status is PROCESSING or PENDING.
 * Sets finishedAt and analysisVersion. Final status is COMPLETED or FLAGGED based on floors.
 */
export async function saveAnalysisResult(
  videoId: string,
  subScores: VocalSubScores,
  options?: {
    /** Pipeline-provided flag reason (e.g. LOW_QUALITY, NO_VOCAL); overrides floor-based FLAGGED. */
    flagReason?: string;
    rawPayload?: object;
    styleCategoryId?: string | null;
    analysisVersion?: string | null;
  }
): Promise<{ accepted: boolean; reason?: string }> {
  const existing = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
    select: { analysisStatus: true, styleCategoryId: true },
  });
  if (!existing) return { accepted: false, reason: 'JOB_NOT_FOUND' };
  if (existing.analysisStatus === 'COMPLETED' || existing.analysisStatus === 'FLAGGED') {
    return { accepted: true, reason: 'IDEMPOTENT_SKIP' };
  }
  if (existing.analysisStatus !== 'PENDING' && existing.analysisStatus !== 'PROCESSING') {
    return { accepted: false, reason: 'INVALID_STATUS' };
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { videoUrl: true },
  });
  if (!video?.videoUrl) return { accepted: false, reason: 'URL_EMPTY' };
  const urlCheck = validateMediaUrlForAnalysis(video.videoUrl);
  if (!urlCheck.allowed) return { accepted: false, reason: urlCheck.reason };

  const overall = computeOverallFromSubScores(subScores);
  let status: AudioAnalysisStatus = 'COMPLETED';
  let flagReason: string | null = null;
  if (options?.flagReason) {
    status = 'FLAGGED';
    flagReason = options.flagReason;
  } else if (overall < VOCAL_SPAM_FLOOR) {
    status = 'FLAGGED';
    flagReason = 'BELOW_SPAM_FLOOR';
  } else if (overall < VOCAL_QUALITY_FLOOR) {
    status = 'FLAGGED';
    flagReason = 'BELOW_QUALITY_FLOOR';
  }
  const styleCategoryId = options?.styleCategoryId ?? existing.styleCategoryId ?? undefined;
  const analysisVersion = options?.analysisVersion ?? ANALYSIS_VERSION;
  const now = new Date();
  const videoModerationStatus = status === 'COMPLETED' ? 'APPROVED' : 'FLAGGED';
  const integrityModerationStatus = mapVideoToIntegrityModeration(videoModerationStatus);

  const existingIntegrity = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: { originalityStatus: true, duplicateRiskScore: true, flagReason: true },
  });
  const duplicateIntegrityConcern =
    existingIntegrity?.originalityStatus === 'SUSPECTED_DUPLICATE' ||
    (existingIntegrity?.duplicateRiskScore != null &&
      existingIntegrity.duplicateRiskScore >= DUPLICATE_RISK_THRESHOLD);

  const integrityUpsertUpdate =
    status !== 'COMPLETED'
      ? {
          moderationStatus: integrityModerationStatus,
          flagReason: 'AUDIO_ANALYSIS_FLAGGED' as const,
          reviewedAt: now,
          updatedAt: now,
        }
      : duplicateIntegrityConcern
        ? {
            moderationStatus: 'PENDING' as const,
            flagReason: existingIntegrity?.flagReason ?? ('DUPLICATE_AUDIO' as const),
            reviewedAt: now,
            updatedAt: now,
          }
        : {
            moderationStatus: 'APPROVED' as const,
            flagReason: null,
            reviewedAt: now,
            updatedAt: now,
          };

  await prisma.$transaction([
    prisma.videoAudioAnalysis.update({
      where: { videoId },
      data: {
        ...subScores,
        overallVocalScore: overall,
        analysisStatus: status,
        flagReason,
        ...(styleCategoryId !== undefined && { styleCategoryId }),
        rawPayload: (options?.rawPayload ?? undefined) as object | undefined,
        finishedAt: now,
        analysisVersion: analysisVersion ?? undefined,
        lastError: null,
        updatedAt: now,
      },
    }),
    prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: status === 'COMPLETED' ? 'READY' : 'FLAGGED',
        status: status === 'COMPLETED' ? 'READY' : 'PROCESSING',
        moderationStatus: videoModerationStatus,
        processingCompletedAt: now,
        processingError: null,
        updatedAt: now,
      },
    }),
    prisma.mediaIntegrityAnalysis.upsert({
      where: { videoId },
      create: {
        videoId,
        moderationStatus: integrityModerationStatus,
        flagReason: status === 'COMPLETED' ? undefined : 'AUDIO_ANALYSIS_FLAGGED',
      },
      update: integrityUpsertUpdate,
    }),
  ]);
  return { accepted: true };
}

/**
 * Mark analysis as failed. Sets lastError, finishedAt, and optionally attemptCount.
 * Uses RETRYABLE_FAILED if retryable and attemptCount < max; otherwise FAILED.
 * Idempotent: no-op if already COMPLETED or FLAGGED.
 */
export async function markAnalysisFailed(
  videoId: string,
  reason?: string,
  options?: { retryable?: boolean; attemptCount?: number }
): Promise<{ accepted: boolean }> {
  const existing = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
    select: { analysisStatus: true, attemptCount: true },
  });
  if (!existing) return { accepted: false };
  if (existing.analysisStatus === 'COMPLETED' || existing.analysisStatus === 'FLAGGED') {
    return { accepted: true };
  }

  const attemptCount = options?.attemptCount ?? existing.attemptCount;
  const retryable = options?.retryable ?? false;
  const finalStatus: AudioAnalysisStatus =
    retryable && attemptCount < MAX_ANALYSIS_ATTEMPTS ? 'RETRYABLE_FAILED' : 'FAILED';
  const now = new Date();

  await prisma.$transaction([
    prisma.videoAudioAnalysis.update({
      where: { videoId },
      data: {
        analysisStatus: finalStatus,
        lastError: reason ?? undefined,
        flagReason: null,
        finishedAt: now,
        ...(options?.attemptCount !== undefined && { attemptCount: options.attemptCount }),
        updatedAt: now,
      },
    }),
    prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: 'PROCESSING_FAILED',
        processingCompletedAt: now,
        processingError: reason ?? 'Audio analysis failed',
        updatedAt: now,
      },
    }),
  ]);
  return { accepted: true };
}

/**
 * Requeue a video for analysis (e.g. after logic change or manual re-run). Resets to PENDING, clears startedAt/finishedAt/lastError; keeps or resets attemptCount.
 */
export async function requeueForAnalysis(videoId: string, options?: { resetAttemptCount?: boolean }): Promise<boolean> {
  const existing = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.videoAudioAnalysis.update({
    where: { videoId },
    data: {
      analysisStatus: 'PENDING',
      startedAt: null,
      finishedAt: null,
      lastError: null,
      ...(options?.resetAttemptCount && { attemptCount: 0 }),
      updatedAt: new Date(),
    },
  });
  return true;
}

/**
 * Dashboard-friendly summary: overall score and sub-scores with user-facing labels.
 * Do not expose raw technical data to normal users.
 */
export type VocalScoreDashboardSummary = {
  overallVocalScore: number;
  status: 'COMPLETED' | 'FLAGGED' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'RETRYABLE_FAILED';
  categories: Array<{ key: string; label: string; score: number }>;
  strengths: string[];
  areasToImprove: string[];
};

const CATEGORY_LABELS: Record<keyof VocalSubScores, string> = {
  pitchAccuracyScore: 'Pitch accuracy',
  rhythmTimingScore: 'Rhythm & timing',
  toneStabilityScore: 'Tone stability',
  clarityScore: 'Clarity',
  dynamicControlScore: 'Dynamic control',
  performanceConfidenceScore: 'Performance confidence',
};

export async function getDashboardSummary(videoId: string): Promise<VocalScoreDashboardSummary | null> {
  const a = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
  });
  if (!a) return null;
  if (a.analysisStatus === 'PENDING' || a.analysisStatus === 'PROCESSING' || a.analysisStatus === 'RETRYABLE_FAILED') {
    return { overallVocalScore: 0, status: a.analysisStatus, categories: [], strengths: [], areasToImprove: [] };
  }
  if (a.analysisStatus === 'FAILED') {
    return { overallVocalScore: 0, status: 'FAILED', categories: [], strengths: [], areasToImprove: [] };
  }
  const subs = {
    pitchAccuracyScore: a.pitchAccuracyScore ?? 0,
    rhythmTimingScore: a.rhythmTimingScore ?? 0,
    toneStabilityScore: a.toneStabilityScore ?? 0,
    clarityScore: a.clarityScore ?? 0,
    dynamicControlScore: a.dynamicControlScore ?? 0,
    performanceConfidenceScore: a.performanceConfidenceScore ?? 0,
  };
  const overall = a.overallVocalScore ?? computeOverallFromSubScores(subs);
  const categories = (Object.keys(CATEGORY_LABELS) as (keyof VocalSubScores)[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: subs[key],
  }));
  const sorted = [...categories].sort((x, y) => y.score - x.score);
  const strengths = sorted.filter((c) => c.score >= 70).map((c) => c.label);
  const areasToImprove = sorted.filter((c) => c.score < 50).map((c) => c.label);
  return {
    overallVocalScore: overall,
    status: a.analysisStatus,
    categories,
    strengths,
    areasToImprove,
  };
}

/**
 * For challenge ranking: whether this video passes the AI quality floor (when analysis exists).
 */
export async function passesChallengeVocalFloor(videoId: string): Promise<boolean> {
  const a = await prisma.videoAudioAnalysis.findUnique({
    where: { videoId },
    select: { overallVocalScore: true, analysisStatus: true },
  });
  if (!a || a.analysisStatus !== 'COMPLETED' || a.overallVocalScore == null) return true;
  return isAboveChallengeFloor(a.overallVocalScore);
}
