/**
 * BETALENT fake content detection & media integrity – thresholds and policy.
 *
 * Do NOT auto-ban from one model output. Use scores as review signals.
 * Confidence-based moderation; support challenge-specific originality rules.
 * Design: lib/media-integrity-architecture.ts. Model: Prisma MediaIntegrityAnalysis.
 */

/** AI voice risk: score 0–100. Levels are review signals, not automatic punishment. */
export const AI_VOICE_RISK_LEVELS = {
  LOW_RISK: { min: 0, max: 25 },
  MEDIUM_RISK: { min: 25, max: 50 },
  HIGH_RISK: { min: 50, max: 75 },
  REVIEW_REQUIRED: { min: 75, max: 100 },
} as const;

/** Above this AI voice score: flag for manual review. */
export const AI_VOICE_REVIEW_THRESHOLD = 60;

/** Above this duplicate risk score: flag as suspected duplicate/stolen. */
export const DUPLICATE_RISK_THRESHOLD = 70;

/** Lip-sync risk (audio/video mismatch): above this = review. */
export const LIP_SYNC_RISK_THRESHOLD = 65;

/** Moderation status that should reduce discoverability (e.g. hide from For You / Trending). */
export const REDUCE_DISCOVERABILITY_STATUSES = ['FLAGGED', 'LIMITED', 'REJECTED', 'BLOCKED'] as const;

/** Moderation status that blocks challenge submission approval. */
export const BLOCK_CHALLENGE_APPROVAL_STATUSES = ['FLAGGED', 'BLOCKED'] as const;

/** Moderation status that blocks monetization eligibility (gifts/super votes counting toward payout). */
export const BLOCK_MONETIZATION_STATUSES = ['BLOCKED'] as const;

/** Originality status that requires review before challenge acceptance. */
export const ORIGINALITY_REVIEW_REQUIRED = ['SUSPECTED_DUPLICATE', 'SUSPECTED_STOLEN', 'REVIEW_REQUIRED'] as const;

/** Challenge originality policy keys (for challenge-specific rules). */
export const ORIGINALITY_POLICY = {
  ORIGINAL_VOCAL_REQUIRED: 'ORIGINAL_VOCAL_REQUIRED',
  BACKING_TRACK_ALLOWED: 'BACKING_TRACK_ALLOWED',
  LIP_SYNC_PROHIBITED: 'LIP_SYNC_PROHIBITED',
  DUPLICATE_REPOSTS_PROHIBITED: 'DUPLICATE_REPOSTS_PROHIBITED',
  FAKE_OR_STOLEN_PROHIBITED: 'FAKE_OR_STOLEN_PROHIBITED',
} as const;

/** Flag reasons for moderation (stored in MediaIntegrityAnalysis.flagReason). */
export const INTEGRITY_FLAG_REASONS = {
  AI_VOICE_SUSPECT: 'AI_VOICE_SUSPECT',
  DUPLICATE_AUDIO: 'DUPLICATE_AUDIO',
  DUPLICATE_VIDEO: 'DUPLICATE_VIDEO',
  SUSPECTED_STOLEN: 'SUSPECTED_STOLEN',
  LIP_SYNC_MISMATCH: 'LIP_SYNC_MISMATCH',
  ORIGINALITY_VIOLATION: 'ORIGINALITY_VIOLATION',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
} as const;

/** Moderation actions supported for integrity (map to ModerationActionType / workflow). */
export const INTEGRITY_MODERATION_ACTIONS = {
  FLAG_FOR_REVIEW: 'FLAG_FOR_REVIEW',
  REDUCE_DISCOVERABILITY: 'REDUCE_DISCOVERABILITY',
  BLOCK_CHALLENGE_APPROVAL: 'BLOCK_CHALLENGE_APPROVAL',
  BLOCK_MONETIZATION: 'BLOCK_MONETIZATION',
  REQUIRE_REVERIFICATION: 'REQUIRE_REVERIFICATION',
  SUSPEND_UPLOAD: 'SUSPEND_UPLOAD',
  REMOVE_DUPLICATE: 'REMOVE_DUPLICATE',
} as const;
