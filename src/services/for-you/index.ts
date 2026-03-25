/**
 * For You V2 — Ranking System
 * Multi-stage pipeline: Candidates → Features → Scoring → Reranking → Assembly
 */

export {
  getForYouFeedV2,
  getTopVideosWithBreakdown,
  getVideoRankingSignals,
  type ScoreBreakdown,
  type TopVideoWithBreakdown,
  type VideoRankingSignals,
} from './feed-v2.service';
export {
  getEarlyDistributionStatus,
  type EarlyDistributionPhase,
  type EarlyDistributionStatus,
} from './early-distribution.service';
export { generateCandidates, type CandidateBucket, type CandidateWithBucket } from './candidates.service';
export { extractFeatures, type VideoFeatures, type CandidateVideo } from './features.service';
export {
  computePrimaryScore,
  halfLifeDecay,
  newUploadBoost,
  isEarlyTestPhase,
  V2_SCORING_WEIGHTS,
  type ScoreExplanation,
} from './scoring.service';
