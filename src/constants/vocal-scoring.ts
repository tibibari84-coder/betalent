/**
 * BETALENT AI Vocal Scoring – weights, thresholds, and fairness config.
 *
 * The AI vocal score is ONE input in a balanced ranking system. It must NOT
 * fully replace audience engagement (super votes, gifts, watch time, likes).
 * Used for: fairness, talent identification, challenge quality floor, low-quality
 * filtering (flag for review), and creator dashboard (overall + sub-scores,
 * strengths, areas to improve). Public-facing presentation is minimal; no raw
 * technical data to normal users.
 *
 * Sub-scores and overall are 0–100. Analysis is style-aware (styleCategoryId
 * stored at analysis time; different styles may use different emphasis later).
 */

/**
 * AI score components (VideoAudioAnalysis sub-scores). Each 0–100.
 * - PitchAccuracyScore: how close the singer is to intended pitch.
 * - RhythmTimingScore: timing consistency and phrase stability.
 * - ToneStabilityScore: steadiness of tone and vocal control.
 * - ClarityScore: vocal intelligibility / cleanliness.
 * - DynamicControlScore: control of loud/soft passages and expression.
 * - PerformanceConfidenceScore: overall vocal steadiness and strength.
 * OverallVocalScore: weighted composite from these (see VOCAL_SCORE_WEIGHTS).
 */

/** Component weights for overall vocal score (0–100). Must sum to 1. */
export const VOCAL_SCORE_WEIGHTS = {
  pitchAccuracy: 0.22,
  rhythmTiming: 0.18,
  toneStability: 0.18,
  clarity: 0.15,
  dynamicControl: 0.12,
  performanceConfidence: 0.15,
} as const;

/** Minimum overall vocal score (0–100) to pass quality floor. Below = FLAGGED for review. */
export const VOCAL_QUALITY_FLOOR = 15;

/** Below this overall score: treat as likely spam / non-vocal / extreme low-effort. */
export const VOCAL_SPAM_FLOOR = 8;

/** Challenge context: minimum vocal score for a performance to be eligible for finalist/ranking refinement. Prevents low-quality viral spam from dominating challenge rankings. */
export const VOCAL_CHALLENGE_QUALITY_FLOOR = 20;

/**
 * Style-aware fairness: vocal styles that may need different analysis emphasis later.
 * Stored as category slug or id at analysis time; used to avoid punishing unique styles
 * (e.g. Gospel, Pop, Soul, Rap Vocals, Classical/Opera, Acoustic, R&B, Jazz).
 */
export const VOCAL_STYLE_SLUGS = [
  'gospel',
  'pop',
  'soul',
  'rnb',
  'rap',
  'classical',
  'opera',
  'acoustic',
  'jazz',
  'rock',
  'country',
  'indie',
  'latin',
  'afrobeat',
  'folk',
  'reggae',
  'alternative',
  'worship',
] as const;

export type VocalStyleSlug = (typeof VOCAL_STYLE_SLUGS)[number];

/** Flag reasons for analysisStatus = FLAGGED (for review; not shown as raw tech to users). */
export const VOCAL_FLAG_REASONS = {
  LOW_QUALITY: 'LOW_QUALITY',
  NO_VOCAL: 'NO_VOCAL',
  BACKING_DOMINANT: 'BACKING_DOMINANT',
  EXTREME_NOISE: 'EXTREME_NOISE',
  BELOW_QUALITY_FLOOR: 'BELOW_QUALITY_FLOOR',
  BELOW_SPAM_FLOOR: 'BELOW_SPAM_FLOOR',
  /** Likely non-vocal or irrelevant upload. */
  LIKELY_NON_VOCAL: 'LIKELY_NON_VOCAL',
  IRRELEVANT: 'IRRELEVANT',
} as const;

export type VocalFlagReason = (typeof VOCAL_FLAG_REASONS)[keyof typeof VOCAL_FLAG_REASONS];
