/**
 * BETALENT media integrity – types for detection pipeline and moderation.
 *
 * Fingerprinting and AI-voice/duplicate detection run in a separate pipeline;
 * this module defines the contract (payload, statuses, flag reasons).
 * Design: lib/media-integrity-architecture.ts. Model: Prisma MediaIntegrityAnalysis.
 */

export type AiVoiceRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'REVIEW_REQUIRED';

export type OriginalityStatus =
  | 'CLEAN'
  | 'SUSPECTED_DUPLICATE'
  | 'SUSPECTED_STOLEN'
  | 'REVIEW_REQUIRED';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'BLOCKED';

export type MediaIntegrityPayload = {
  audioFingerprint?: string | null;
  videoFingerprint?: string | null;
  aiVoiceRiskScore?: number | null;
  duplicateRiskScore?: number | null;
  lipSyncRiskScore?: number | null;
  originalityStatus?: OriginalityStatus;
  rawPayload?: object | null;
};

export type IntegrityFlagReason =
  | 'AI_VOICE_SUSPECT'
  | 'DUPLICATE_AUDIO'
  | 'DUPLICATE_VIDEO'
  | 'SUSPECTED_STOLEN'
  | 'LIP_SYNC_MISMATCH'
  | 'ORIGINALITY_VIOLATION'
  | 'MANUAL_REVIEW';
