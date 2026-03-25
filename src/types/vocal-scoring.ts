/**
 * BETALENT AI Vocal Scoring – types for analysis pipeline and dashboard.
 *
 * Sub-scores are 0–100. The analysis pipeline (external ML/audio service) should
 * extract pitch contour, timing, voice activity, clarity, dynamic range, and
 * optionally backing-track dominance, then produce these scores. This module
 * does not implement audio analysis; it defines the contract.
 */

export type VocalSubScoresInput = {
  pitchAccuracyScore: number;
  rhythmTimingScore: number;
  toneStabilityScore: number;
  clarityScore: number;
  dynamicControlScore: number;
  performanceConfidenceScore: number;
};

/** Analysis status as stored in DB. */
export type AudioAnalysisStatus = 'PENDING' | 'COMPLETED' | 'FLAGGED' | 'FAILED';

/** Reason for FLAGGED status (review, not shown as raw tech to users). */
export type VocalFlagReason =
  | 'LOW_QUALITY'
  | 'NO_VOCAL'
  | 'BACKING_DOMINANT'
  | 'EXTREME_NOISE'
  | 'BELOW_QUALITY_FLOOR'
  | 'BELOW_SPAM_FLOOR';
