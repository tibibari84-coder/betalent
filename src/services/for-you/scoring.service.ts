/**
 * For You V2 — Primary Scoring Layer
 * Explicit weighted ranker from measurable features (no learned model, no “AI” claims).
 */

import type { VideoFeatures } from './features.service';
import {
  FOR_YOU_HALFLIFE_HOURS,
  FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS,
  FOR_YOU_NEW_UPLOAD_BOOST_HOURS,
  FOR_YOU_NEW_UPLOAD_BOOST,
  FOR_YOU_RETENTION_WEIGHTS,
  FOR_YOU_FINAL_WEIGHTS,
  NEW_CREATOR_UPLOAD_LIMIT,
  NEW_CREATOR_DISCOVERY_BOOST,
} from '@/constants/ranking';
import { capForYouGiftSupportQuality } from '@/services/fair-discovery.service';

/** V2 ML-style weights. Retention dominant; support second; engagement third. */
export const V2_SCORING_WEIGHTS = FOR_YOU_FINAL_WEIGHTS;

/** Half-life decay: score influence halves every N hours. */
export const HALFLIFE_HOURS = FOR_YOU_HALFLIFE_HOURS;

/** New uploads: exploration boost window (hours). */
export const EXPLORATION_BOOST_WINDOW_HOURS = FOR_YOU_NEW_UPLOAD_BOOST_HOURS;

/** Early test phase: videos younger than this get limited discovery exposure. */
export const EARLY_TEST_HOURS = 48;

/** Freshness floor: minimum decay multiplier (prevents total collapse). */
export const FRESHNESS_FLOOR = 0.1;

/**
 * Half-life decay multiplier.
 * Every HALFLIFE_HOURS, freshness influence halves.
 * Strong retention/support/engagement can counterbalance decay.
 */
export function halfLifeDecay(
  ageHours: number,
  retentionNorm: number,
  supportNorm: number,
  engagementNorm: number
): number {
  const decay = Math.pow(0.5, ageHours / HALFLIFE_HOURS);
  const w = FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS;
  const counterbalance = Math.min(
    1,
    w.retention * retentionNorm + w.support * supportNorm + w.engagement * engagementNorm
  );
  return Math.max(FRESHNESS_FLOOR, Math.min(1, decay + (1 - decay) * counterbalance));
}

/**
 * New upload boost: videos in first N hours get discovery boost.
 */
export function newUploadBoost(ageHours: number): number {
  return ageHours <= EXPLORATION_BOOST_WINDOW_HOURS ? 1 + FOR_YOU_NEW_UPLOAD_BOOST : 1;
}

/**
 * Early test phase: is video in "limited discovery" window?
 * New uploads get a small chance to gather first watch signals.
 */
export function isEarlyTestPhase(ageHours: number): boolean {
  return ageHours <= EARLY_TEST_HOURS;
}

/** Explainable score breakdown. All components visible for admin debug. */
export interface ScoreExplanation {
  baseScore: number;
  retentionScore: number;
  retentionQuality: number;
  completionRate: number;
  watchTimeQuality: number;
  replayBoost: number;
  retentionSkipPenalty: number;
  engagementQuality: number;
  supportQuality: number;
  personalizationAffinity: number;
  freshnessAdjusted: number;
  creatorQuality: number;
  challengeRelevance: number;
  voteScore: number;
  voteScoreAverageStars: number;
  voteScoreCount: number;
  safetyPenalty: number;
  decayMultiplier: number;
  newUploadBoost: number;
  creatorBoost: number;
  earlyTestPhase: boolean;
}

/**
 * Compute primary score from extracted features.
 * baseScore = sum(component * weight) − safetyPenalty; gift blend is capped in fair-discovery.
 */
export function computePrimaryScore(
  f: VideoFeatures,
  creatorVideosCount: number,
  debug = false
): { score: number; explanation?: ScoreExplanation } {
  const ageHours = f.ageHours;

  const wRet = FOR_YOU_RETENTION_WEIGHTS;
  const retentionScore = Math.max(
    0,
    Math.min(
      1,
      f.completionRate * wRet.completionRate +
        f.watchTimeQuality * wRet.watchTimeQuality +
        f.replayBoost -
        f.retentionSkipPenalty
    )
  );
  const engagementQuality =
    f.likeRate * 0.32 +
    f.commentRate * 0.28 +
    f.shareRate * 0.18 +
    f.shareVelocity * 0.14 +
    // NOTE: followerGrowthProxy is an approximate reach proxy (normalized followers),
    // not true follower growth. Weight kept unchanged for backwards compatibility.
    f.followerGrowthProxy * 0.08;
  const giftBlendCapped = capForYouGiftSupportQuality(f.giftCoinsPerView * 0.52, f.forYouGiftBoost * 0.15);
  const supportQuality = f.voteRate * 0.33 + giftBlendCapped;
  const personalizationAffinity =
    f.categoryMatch * 0.35 +
    f.creatorMatch * 0.30 +
    f.styleMatch * 0.25 +
    f.contentTypeAffinity * 0.10;
  const creatorQuality = f.talentScore * 0.5 + f.creatorQualityScore * 0.5;

  const decayMult = halfLifeDecay(
    ageHours,
    retentionScore,
    supportQuality,
    engagementQuality
  );
  const freshnessAdjusted = decayMult;

  const safetyPenalty = f.moderationPenalty * 0.5 + f.reportRate * 0.5;

  const w = V2_SCORING_WEIGHTS;
  const talentScoreNorm = f.talentScore;
  const baseScore =
    retentionScore * w.retentionScore +
    supportQuality * w.supportScore +
    engagementQuality * w.engagementScore +
    personalizationAffinity * w.personalizationScore +
    freshnessAdjusted * w.freshnessScore +
    f.challengeRelevance * w.challengeScore +
    creatorQuality * w.creatorQualityScore +
    talentScoreNorm * w.talentScore +
    f.voteScore * (w.voteScore ?? 0) -
    safetyPenalty * 0.15;

  const newUploadMult = newUploadBoost(ageHours);
  const creatorBoost =
    creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT ? NEW_CREATOR_DISCOVERY_BOOST : 1;
  const earlyTestPhase = isEarlyTestPhase(ageHours);

  const score = Math.max(0, baseScore) * newUploadMult * creatorBoost;

  if (debug) {
    return {
      score,
      explanation: {
        baseScore,
        retentionScore,
        retentionQuality: retentionScore,
        completionRate: f.completionRate,
        watchTimeQuality: f.watchTimeQuality,
        replayBoost: f.replayBoost,
        retentionSkipPenalty: f.retentionSkipPenalty,
        engagementQuality,
        supportQuality,
        personalizationAffinity,
        freshnessAdjusted,
        creatorQuality,
        challengeRelevance: f.challengeRelevance,
        voteScore: f.voteScore,
        voteScoreAverageStars: f.voteScoreAverageStars,
        voteScoreCount: f.voteScoreCount,
        safetyPenalty,
        decayMultiplier: decayMult,
        newUploadBoost: newUploadMult,
        creatorBoost,
        earlyTestPhase,
      },
    };
  }
  return { score };
}
