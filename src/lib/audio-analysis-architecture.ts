/**
 * BETALENT Audio Analysis Architecture – contract for the AI vocal scoring pipeline.
 *
 * This module defines the interface between the platform and a future ML/audio processing
 * pipeline. It does NOT implement scoring logic. Actual analysis (pitch contour, timing,
 * clarity, etc.) runs in a separate worker; this file documents:
 * - What the pipeline receives (inputs)
 * - What it must extract from audio (extraction concepts)
 * - What it returns (outputs → VideoAudioAnalysis sub-scores)
 * - How results are used (ranking, challenge, low-quality filtering)
 *
 * See: services/vocal-scoring.service.ts, constants/vocal-scoring.ts, prisma VideoAudioAnalysis.
 */

/** Pipeline input: one video ready for analysis. */
export type AudioAnalysisJobInput = {
  videoId: string;
  videoUrl: string;
  /** Category at upload time; used for style-aware fairness (e.g. Gospel, Pop, Rap). */
  styleCategoryId: string | null;
  attemptCount: number;
};

/**
 * Extraction concepts the pipeline should derive from vocal audio.
 * These map to the six sub-scores stored in VideoAudioAnalysis.
 * Different vocal styles (Gospel, Classical, Rap, etc.) may use different
 * analysis emphasis later; styleCategoryId is passed for style-aware logic.
 */
export const AUDIO_EXTRACTION_CONCEPTS = {
  /** Pitch contour → how close the singer is to intended pitch → pitchAccuracyScore (0–100). */
  PITCH_ACCURACY: 'pitch_accuracy',
  /** Timing consistency, phrase stability → rhythmTimingScore (0–100). */
  RHYTHM_TIMING: 'rhythm_timing',
  /** Steadiness of tone, vocal control → toneStabilityScore (0–100). */
  TONE_STABILITY: 'tone_stability',
  /** Vocal intelligibility, cleanliness → clarityScore (0–100). */
  CLARITY: 'clarity',
  /** Control of loud/soft passages, expression → dynamicControlScore (0–100). */
  DYNAMIC_CONTROL: 'dynamic_control',
  /** Overall vocal steadiness and strength → performanceConfidenceScore (0–100). */
  PERFORMANCE_CONFIDENCE: 'performance_confidence',
} as const;

/**
 * Optional signals the pipeline may detect for flagging (review), not stored as sub-scores:
 * - Voice activity (sufficient vocal presence vs. silence/noise)
 * - Backing track dominance (instrumental overpowering vocal)
 * - Signal clarity / extreme noise
 * - Possible non-vocal or irrelevant content
 */
export const AUDIO_FLAG_SIGNALS = {
  LOW_VOICE_ACTIVITY: 'low_voice_activity',
  BACKING_DOMINANT: 'backing_dominant',
  EXTREME_NOISE: 'extreme_noise',
  LIKELY_NON_VOCAL: 'likely_non_vocal',
  IRRELEVANT: 'irrelevant',
} as const;

/** Pipeline output: sub-scores (0–100 each) and optional flag. Overall is computed by platform from weights. */
export type AudioAnalysisPipelineOutput = {
  pitchAccuracyScore: number;
  rhythmTimingScore: number;
  toneStabilityScore: number;
  clarityScore: number;
  dynamicControlScore: number;
  performanceConfidenceScore: number;
  /** If set, analysis is stored as FLAGGED for review; use VOCAL_FLAG_REASONS. */
  flagReason?: string;
  /** Optional ML metadata; stored in rawPayload, not shown to users. */
  rawPayload?: Record<string, unknown>;
};

/** Mapping from extraction concept to VideoAudioAnalysis field (for pipeline implementers). */
export const EXTRACTION_TO_SUBSCORE: Record<string, keyof AudioAnalysisPipelineOutput> = {
  [AUDIO_EXTRACTION_CONCEPTS.PITCH_ACCURACY]: 'pitchAccuracyScore',
  [AUDIO_EXTRACTION_CONCEPTS.RHYTHM_TIMING]: 'rhythmTimingScore',
  [AUDIO_EXTRACTION_CONCEPTS.TONE_STABILITY]: 'toneStabilityScore',
  [AUDIO_EXTRACTION_CONCEPTS.CLARITY]: 'clarityScore',
  [AUDIO_EXTRACTION_CONCEPTS.DYNAMIC_CONTROL]: 'dynamicControlScore',
  [AUDIO_EXTRACTION_CONCEPTS.PERFORMANCE_CONFIDENCE]: 'performanceConfidenceScore',
};

/**
 * Platform role of the AI vocal score (design rule).
 * - One weighted signal among: watch time, super votes, gifts, engagement, freshness.
 * - Challenge: stronger weight + quality floor for finalist/ranking refinement.
 * - Low-quality / abuse: FLAGGED for review; does not blindly block.
 * - Dashboard: overall + sub-scores, strengths, areas to improve; no raw technical data to users.
 */
