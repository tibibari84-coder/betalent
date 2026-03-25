/**
 * Media integrity – persistence and policy helpers for `MediaIntegrityAnalysis`.
 *
 * **What actually runs in this codebase (post-upload v1):**
 * - `runPostUploadIntegrityAnalysis`: SHA-256 of creator + duration + file size + mime (metadata
 *   only — not perceptual video hashing, not audio content fingerprinting).
 * - Same-creator heuristic: if another **UPLOADED** video shares the same `durationSec` and
 *   `fileSize`, `duplicateRiskScore` is raised → `recordAnalysis` may set `SUSPECTED_DUPLICATE`
 *   and `DUPLICATE_AUDIO` flag reason. High false-positive risk for coincidental matches.
 *
 * **Not wired to real detectors here:** `audioFingerprint`, `aiVoiceRiskScore` / `aiVoiceRiskLevel`,
 * `lipSyncRiskScore`. Those fields stay unset until a real pipeline writes them — do not sell them
 * as live anti-cheat.
 *
 * Design contract: `lib/media-integrity-architecture.ts`. Exports: `recordAnalysis`,
 * `shouldReduceDiscoverability`, challenge/monetization gates, `passesOriginalityForChallenge`.
 */

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { AiVoiceRiskLevel, OriginalityStatus, ModerationStatus } from '@prisma/client';
import { mapIntegrityToVideoModeration } from '@/lib/video-moderation';
import {
  AI_VOICE_RISK_LEVELS,
  AI_VOICE_REVIEW_THRESHOLD,
  DUPLICATE_RISK_THRESHOLD,
  LIP_SYNC_RISK_THRESHOLD,
  REDUCE_DISCOVERABILITY_STATUSES,
  BLOCK_CHALLENGE_APPROVAL_STATUSES,
  BLOCK_MONETIZATION_STATUSES,
  ORIGINALITY_REVIEW_REQUIRED,
  ORIGINALITY_POLICY,
} from '@/constants/media-integrity';

export type MediaIntegrityPayload = {
  audioFingerprint?: string | null;
  videoFingerprint?: string | null;
  aiVoiceRiskScore?: number | null;
  duplicateRiskScore?: number | null;
  lipSyncRiskScore?: number | null;
  originalityStatus?: OriginalityStatus;
  rawPayload?: object | null;
};

function scoreToAiVoiceRiskLevel(score: number): AiVoiceRiskLevel {
  if (score >= AI_VOICE_RISK_LEVELS.REVIEW_REQUIRED.min) return 'REVIEW_REQUIRED';
  if (score >= AI_VOICE_RISK_LEVELS.HIGH_RISK.min) return 'HIGH_RISK';
  if (score >= AI_VOICE_RISK_LEVELS.MEDIUM_RISK.min) return 'MEDIUM_RISK';
  return 'LOW_RISK';
}

/**
 * Get or create MediaIntegrityAnalysis for a video. Defaults to PENDING/CLEAN until pipeline runs.
 */
export async function getOrCreateAnalysis(videoId: string) {
  return prisma.mediaIntegrityAnalysis.upsert({
    where: { videoId },
    create: { videoId, moderationStatus: 'PENDING', originalityStatus: 'CLEAN' },
    update: {},
  });
}

/**
 * Get analysis for a video, or null if none.
 */
export async function getAnalysisForVideo(videoId: string) {
  return prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
  });
}

const POST_UPLOAD_INTEGRITY_PIPELINE = 'post_upload_integrity_v1' as const;

/**
 * Server-side integrity pass after the file is stored and `uploadStatus` is UPLOADED.
 * Safe to call from upload completion paths; failures should be caught by the caller.
 *
 * Populates: `videoFingerprint` (structural hash), `duplicateRiskScore` (heuristic), `rawPayload`
 * provenance. Does **not** set AI voice or lip-sync scores (no detectors in repo).
 */
export async function runPostUploadIntegrityAnalysis(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      creatorId: true,
      durationSec: true,
      fileSize: true,
      mimeType: true,
      uploadStatus: true,
    },
  });

  if (!video || video.uploadStatus !== 'UPLOADED') {
    return;
  }

  const structuralKey = [
    video.creatorId,
    String(video.durationSec),
    video.fileSize != null ? String(video.fileSize) : '',
    video.mimeType ?? '',
  ].join(':');
  const videoFingerprint = createHash('sha256').update(structuralKey, 'utf8').digest('hex');

  let sameCreatorUploadedMatches = 0;
  if (video.fileSize != null) {
    sameCreatorUploadedMatches = await prisma.video.count({
      where: {
        creatorId: video.creatorId,
        id: { not: videoId },
        durationSec: video.durationSec,
        fileSize: video.fileSize,
        uploadStatus: 'UPLOADED',
      },
    });
  }

  const duplicateRiskScore =
    video.fileSize != null && sameCreatorUploadedMatches > 0
      ? Math.min(100, DUPLICATE_RISK_THRESHOLD + Math.min(29, sameCreatorUploadedMatches * 15))
      : 0;

  await recordAnalysis(videoId, {
    videoFingerprint,
    duplicateRiskScore,
    rawPayload: {
      pipeline: POST_UPLOAD_INTEGRITY_PIPELINE,
      videoFingerprintKind: 'structural_metadata_sha256',
      sameCreatorUploadedDurationAndFileSizeMatchCount: sameCreatorUploadedMatches,
      limits:
        'Not perceptual hashing; duplicate signal is heuristic only (same user, same duration+size).',
    },
  });
}

/**
 * Record analysis result from a detection pipeline (or post-upload v1). Derives `aiVoiceRiskLevel`
 * only when `aiVoiceRiskScore` is provided; duplicate / lip thresholds apply when scores are set.
 */
export async function recordAnalysis(
  videoId: string,
  payload: MediaIntegrityPayload,
  options?: { moderationStatus?: ModerationStatus; flagReason?: string }
): Promise<void> {
  const aiScore = payload.aiVoiceRiskScore ?? null;
  const dupScore = payload.duplicateRiskScore ?? null;
  const lipScore = payload.lipSyncRiskScore ?? null;
  const aiLevel = aiScore != null ? scoreToAiVoiceRiskLevel(aiScore) : null;
  let originalityStatus: OriginalityStatus = payload.originalityStatus ?? 'CLEAN';
  let moderationStatus: ModerationStatus = options?.moderationStatus ?? 'PENDING';
  let flagReason: string | null = options?.flagReason ?? null;

  if (dupScore != null && dupScore >= DUPLICATE_RISK_THRESHOLD && originalityStatus === 'CLEAN') {
    originalityStatus = 'SUSPECTED_DUPLICATE';
    if (!flagReason) flagReason = 'DUPLICATE_AUDIO';
  }
  if (aiScore != null && aiScore >= AI_VOICE_REVIEW_THRESHOLD && moderationStatus === 'PENDING') {
    moderationStatus = 'FLAGGED';
    if (!flagReason) flagReason = 'AI_VOICE_SUSPECT';
  }
  if (lipScore != null && lipScore >= LIP_SYNC_RISK_THRESHOLD && !flagReason) {
    flagReason = 'LIP_SYNC_MISMATCH';
    if (moderationStatus === 'PENDING') moderationStatus = 'FLAGGED';
  }

  const legacyModerationStatus = mapIntegrityToVideoModeration(moderationStatus);
  await prisma.$transaction([
    prisma.mediaIntegrityAnalysis.upsert({
      where: { videoId },
      create: {
        videoId,
        audioFingerprint: payload.audioFingerprint ?? undefined,
        videoFingerprint: payload.videoFingerprint ?? undefined,
        aiVoiceRiskScore: aiScore ?? undefined,
        aiVoiceRiskLevel: aiLevel ?? undefined,
        duplicateRiskScore: dupScore ?? undefined,
        lipSyncRiskScore: lipScore ?? undefined,
        originalityStatus,
        moderationStatus,
        flagReason,
        rawPayload: payload.rawPayload ? (payload.rawPayload as object) : undefined,
      },
      update: {
        audioFingerprint: payload.audioFingerprint ?? undefined,
        videoFingerprint: payload.videoFingerprint ?? undefined,
        aiVoiceRiskScore: aiScore ?? undefined,
        aiVoiceRiskLevel: aiLevel ?? undefined,
        duplicateRiskScore: dupScore ?? undefined,
        lipSyncRiskScore: lipScore ?? undefined,
        originalityStatus,
        moderationStatus,
        flagReason: flagReason ?? undefined,
        rawPayload: payload.rawPayload ? (payload.rawPayload as object) : undefined,
        updatedAt: new Date(),
      },
    }),
    prisma.video.update({
      where: { id: videoId },
      data: { moderationStatus: legacyModerationStatus, updatedAt: new Date() },
    }),
  ]);
}

/**
 * Set moderation status (e.g. after manual review). Optionally set reviewedAt.
 */
export async function setModerationStatus(
  videoId: string,
  status: ModerationStatus,
  options?: { flagReason?: string | null }
): Promise<void> {
  const legacyModerationStatus = mapIntegrityToVideoModeration(status);
  await prisma.$transaction([
    prisma.mediaIntegrityAnalysis.upsert({
      where: { videoId },
      create: {
        videoId,
        moderationStatus: status,
        flagReason: options?.flagReason ?? undefined,
        reviewedAt: new Date(),
      },
      update: {
        moderationStatus: status,
        ...(options?.flagReason !== undefined && { flagReason: options.flagReason }),
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    }),
    prisma.video.update({
      where: { id: videoId },
      data: { moderationStatus: legacyModerationStatus, updatedAt: new Date() },
    }),
  ]);
}

/**
 * Whether this video's moderation status should reduce discoverability (e.g. exclude from For You / Trending).
 */
export async function shouldReduceDiscoverability(videoId: string): Promise<boolean> {
  const a = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: { moderationStatus: true },
  });
  if (!a) return false;
  return (REDUCE_DISCOVERABILITY_STATUSES as readonly string[]).includes(a.moderationStatus);
}

/**
 * Whether this video should be blocked from challenge submission approval (e.g. originality or integrity failure).
 */
export async function shouldBlockChallengeApproval(videoId: string): Promise<boolean> {
  const a = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: { moderationStatus: true },
  });
  if (!a) return false;
  return (BLOCK_CHALLENGE_APPROVAL_STATUSES as readonly string[]).includes(a.moderationStatus);
}

/**
 * Whether this video's monetization (gifts/super votes toward payout) should be blocked.
 */
export async function shouldBlockMonetization(videoId: string): Promise<boolean> {
  const a = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: { moderationStatus: true },
  });
  if (!a) return false;
  return (BLOCK_MONETIZATION_STATUSES as readonly string[]).includes(a.moderationStatus);
}

/**
 * Whether the video passes originality/integrity for a challenge. When policies are provided
 * (ORIGINALITY_POLICY keys from challenge rules), applies policy-aware checks.
 * Fail-closed: if no analysis exists (e.g. processing not finished, legacy video), returns false.
 */
export async function passesOriginalityForChallenge(
  videoId: string,
  policies?: string[]
): Promise<boolean> {
  const a = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: {
      originalityStatus: true,
      moderationStatus: true,
      lipSyncRiskScore: true,
      aiVoiceRiskLevel: true,
    },
  });
  if (!a) return false;

  if ((BLOCK_CHALLENGE_APPROVAL_STATUSES as readonly string[]).includes(a.moderationStatus)) return false;
  if ((ORIGINALITY_REVIEW_REQUIRED as readonly string[]).includes(a.originalityStatus)) return false;

  if (policies && policies.length > 0) {
    if (policies.includes(ORIGINALITY_POLICY.LIP_SYNC_PROHIBITED) && a.lipSyncRiskScore != null && a.lipSyncRiskScore >= LIP_SYNC_RISK_THRESHOLD) return false;
    if (policies.includes(ORIGINALITY_POLICY.DUPLICATE_REPOSTS_PROHIBITED) && (ORIGINALITY_REVIEW_REQUIRED as readonly string[]).includes(a.originalityStatus)) return false;
    if (policies.includes(ORIGINALITY_POLICY.ORIGINAL_VOCAL_REQUIRED) && (a.aiVoiceRiskLevel === 'HIGH_RISK' || a.aiVoiceRiskLevel === 'REVIEW_REQUIRED')) return false;
    if (policies.includes(ORIGINALITY_POLICY.FAKE_OR_STOLEN_PROHIBITED) && ((BLOCK_CHALLENGE_APPROVAL_STATUSES as readonly string[]).includes(a.moderationStatus) || (ORIGINALITY_REVIEW_REQUIRED as readonly string[]).includes(a.originalityStatus) || a.aiVoiceRiskLevel === 'REVIEW_REQUIRED')) return false;
  }

  return true;
}

/**
 * Get current moderation status for a video. Returns PENDING if no analysis.
 */
export async function getModerationStatus(videoId: string): Promise<ModerationStatus | null> {
  const a = await prisma.mediaIntegrityAnalysis.findUnique({
    where: { videoId },
    select: { moderationStatus: true },
  });
  return a?.moderationStatus ?? null;
}

/**
 * Find other videos with the same audio or video fingerprint (for duplicate detection).
 * Exclude the given videoId. Returns list of videoIds that may be duplicates.
 */
export async function findPotentialDuplicateVideoIds(
  videoId: string,
  audioFingerprint: string | null,
  videoFingerprint: string | null
): Promise<string[]> {
  if (!audioFingerprint && !videoFingerprint) return [];
  const or: { audioFingerprint?: string; videoFingerprint?: string }[] = [];
  if (audioFingerprint) or.push({ audioFingerprint });
  if (videoFingerprint) or.push({ videoFingerprint });
  const others = await prisma.mediaIntegrityAnalysis.findMany({
    where: { videoId: { not: videoId }, OR: or.length ? or : undefined },
    select: { videoId: true },
  });
  return others.map((r) => r.videoId);
}
