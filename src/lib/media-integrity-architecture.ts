/**
 * Media integrity – design contract (targets vs what ships in-repo).
 *
 * **In this repo today:** `runPostUploadIntegrityAnalysis` + `recordAnalysis` only populate
 * structural `videoFingerprint`, heuristic `duplicateRiskScore`, derived `originalityStatus` /
 * `flagReason` for duplicates, and sync legacy `Video.moderationStatus` from integrity rules.
 * AI voice, lip-sync, and content `audioFingerprint` are schema-ready only — not computed here.
 *
 * **Design targets:** AI-generated vocal suspicion, stolen/duplicate media, lip-sync abuse.
 * Do not auto-ban from a single model output; use scores as review signals.
 *
 * Implementation: services/media-integrity.service.ts, constants/media-integrity.ts,
 * Prisma MediaIntegrityAnalysis, OriginalityStatus, ModerationStatus, AiVoiceRiskLevel.
 */

// ---------------------------------------------------------------------------
// 1. DETECTION AREAS
// ---------------------------------------------------------------------------

/**
 * A. AI voice suspicion
 * - Synthetic vocal artifacts, unnatural consistency, generated-sounding vocal
 *   fingerprints, suspicious vocal patterning → aiVoiceRiskScore (0–100), aiVoiceRiskLevel.
 *
 * B. Duplicate audio detection
 * - Same audio used by multiple uploads; near-identical music/vocal fingerprints.
 *   → audioFingerprint, duplicateRiskScore; flag SUSPECTED_DUPLICATE / SUSPECTED_STOLEN.
 *
 * C. Duplicate video detection
 * - Perceptual similarity, frame fingerprint similarity, mirrored/cropped duplicates.
 *   → videoFingerprint, duplicateRiskScore; findPotentialDuplicateVideoIds().
 *
 * D. Lip-sync / playback abuse
 * - Mismatch between visible performance and audio source; challenge-specific
 *   policy (LIP_SYNC_PROHIBITED) → lipSyncRiskScore (0–100).
 */

export const DETECTION_AREAS = {
  AI_VOICE: 'ai_voice',
  DUPLICATE_AUDIO: 'duplicate_audio',
  DUPLICATE_VIDEO: 'duplicate_video',
  LIP_SYNC: 'lip_sync',
} as const;

// ---------------------------------------------------------------------------
// 2. MEDIA FINGERPRINTING
// ---------------------------------------------------------------------------

/**
 * Fingerprinting systems (run in separate pipeline; this service persists results):
 *
 * - Audio fingerprint: hash or feature vector for duplicate audio detection;
 *   same or near-identical fingerprint across uploads → flag exact/near duplicate.
 * - Video fingerprint: perceptual/frame-based fingerprint; mirrored/cropped
 *   duplicates can be detected via similarity.
 * - Exact duplicate: same fingerprint string match.
 * - Near-duplicate: similarity above threshold (pipeline-specific); stored as
 *   duplicateRiskScore and/or matched fingerprint references in rawPayload.
 */

export const FINGERPRINT_KINDS = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

/** Use fingerprints to flag: exact duplicates, near duplicates, suspicious reused media. */
export const FINGERPRINT_FLAG_USES = {
  EXACT_DUPLICATE: 'exact_duplicate',
  NEAR_DUPLICATE: 'near_duplicate',
  SUSPICIOUS_REUSED: 'suspicious_reused',
} as const;

// ---------------------------------------------------------------------------
// 3. AI VOICE RISK SCORE
// ---------------------------------------------------------------------------

/**
 * aiVoiceRiskScore 0–100; higher = more likely synthetic. Do NOT auto-ban from one model.
 * AiVoiceRiskLevel: LOW_RISK, MEDIUM_RISK, HIGH_RISK, REVIEW_REQUIRED.
 * Thresholds: constants/media-integrity.ts (AI_VOICE_RISK_LEVELS, AI_VOICE_REVIEW_THRESHOLD).
 * Above AI_VOICE_REVIEW_THRESHOLD → flag for manual review (moderationStatus FLAGGED).
 */

// ---------------------------------------------------------------------------
// 4. ORIGINALITY RULES (challenge-specific)
// ---------------------------------------------------------------------------

/**
 * Content originality support for challenge submissions. Challenges may declare
 * policy keys (e.g. in rules or config) that map to checks:
 *
 * - ORIGINAL_VOCAL_REQUIRED: fail if aiVoiceRiskLevel is HIGH_RISK or REVIEW_REQUIRED.
 * - BACKING_TRACK_ALLOWED: challenge-specific; no extra integrity check from this key.
 * - LIP_SYNC_PROHIBITED: fail if lipSyncRiskScore above LIP_SYNC_RISK_THRESHOLD.
 * - DUPLICATE_REPOSTS_PROHIBITED: fail if originalityStatus is SUSPECTED_DUPLICATE or SUSPECTED_STOLEN.
 * - FAKE_OR_STOLEN_PROHIBITED: fail if FLAGGED/BLOCKED or REVIEW_REQUIRED originality or high AI voice.
 *
 * passesOriginalityForChallenge(videoId, policies) applies these when policies are provided.
 */

export const ORIGINALITY_POLICY_KEYS = {
  ORIGINAL_VOCAL_REQUIRED: 'ORIGINAL_VOCAL_REQUIRED',
  BACKING_TRACK_ALLOWED: 'BACKING_TRACK_ALLOWED',
  LIP_SYNC_PROHIBITED: 'LIP_SYNC_PROHIBITED',
  DUPLICATE_REPOSTS_PROHIBITED: 'DUPLICATE_REPOSTS_PROHIBITED',
  FAKE_OR_STOLEN_PROHIBITED: 'FAKE_OR_STOLEN_PROHIBITED',
} as const;

// ---------------------------------------------------------------------------
// 5. ORIGINALITY STATUS & MODERATION STATUS
// ---------------------------------------------------------------------------

/**
 * OriginalityStatus (MediaIntegrityAnalysis): CLEAN, SUSPECTED_DUPLICATE,
 * SUSPECTED_STOLEN, REVIEW_REQUIRED. Used for challenge eligibility and moderation queue.
 *
 * ModerationStatus: PENDING, APPROVED, FLAGGED, LIMITED, REJECTED, BLOCKED.
 * Drives discoverability, challenge approval, and monetization gates.
 */

// ---------------------------------------------------------------------------
// 6. MODERATION ACTIONS (confidence-based)
// ---------------------------------------------------------------------------

/**
 * When suspicious content is detected, support actions (via ModerationActionType / workflow):
 *
 * - Flag for manual review: set moderationStatus FLAGGED; queue in moderation dashboard.
 * - Reduce discoverability: status in REDUCE_DISCOVERABILITY_STATUSES → exclude from For You / Trending.
 * - Block challenge submission approval: status in BLOCK_CHALLENGE_APPROVAL_STATUSES.
 * - Block monetization eligibility: status in BLOCK_MONETIZATION_STATUSES (e.g. BLOCKED).
 * - Require re-verification: moderation workflow; may set LIMITED or require creator verification.
 * - Suspend upload: per-user or global policy (outside this model).
 * - Remove duplicate content: moderation action to hide/remove video; duplicate chain in queue.
 *
 * Do not instantly punish on weak evidence; use confidence thresholds and manual review.
 */

// ---------------------------------------------------------------------------
// 7. DETECTION PIPELINE CONTRACT (input/output)
// ---------------------------------------------------------------------------

/** Input for a media-integrity detection job (pipeline consumes). */
export type MediaIntegrityJobInput = {
  videoId: string;
  videoUrl: string;
  /** Optional: challenge ID if submission; used for policy-aware checks. */
  challengeId?: string | null;
};

/** Output from detection pipeline → recordAnalysis(). */
export type MediaIntegrityPipelineOutput = {
  audioFingerprint?: string | null;
  videoFingerprint?: string | null;
  aiVoiceRiskScore?: number | null;
  duplicateRiskScore?: number | null;
  lipSyncRiskScore?: number | null;
  /** Pipeline may suggest; service can override from thresholds. */
  originalityStatus?: 'CLEAN' | 'SUSPECTED_DUPLICATE' | 'SUSPECTED_STOLEN' | 'REVIEW_REQUIRED';
  rawPayload?: Record<string, unknown> | null;
};
