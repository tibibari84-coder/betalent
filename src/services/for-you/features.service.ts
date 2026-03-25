/**
 * For You V2 — Feature Extraction
 * Structured features for ML-style ranking. Clean separation for future learned models.
 */

import { VIDEO_LIMITS } from '@/constants/video-limits';
import type { UserAffinity } from '@/services/user-affinity.service';

export type CandidateVideo = {
  id: string;
  creatorId: string;
  categoryId: string;
  performanceStyle: string | null;
  contentType: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  sharesLast24h?: number;
  coinsCount: number;
  /** For You monetization signals (VideoSupportStats); separate from challenge totalCoinsEarned. */
  forYouGiftCoinsTotal?: number;
  recentGiftVelocity?: number;
  viewsCount: number;
  votesCount: number;
  talentScore: number | null;
  reportCount: number;
  isFlagged: boolean;
  createdAt: Date;
  durationSec: number;
  creatorVideosCount: number;
  creatorFollowersCount?: number;
  watchStats: {
    totalWatchSeconds: number;
    completedViewsCount: number;
    viewCount: number;
    skipCount: number;
    replayCount: number;
  } | null;
  challengeId: string | null;
  /** Challenge star votes (1–5). When present, used for voteScore. */
  starVote?: { averageStars: number; votesCount: number } | null;
};

function safeRatio(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(1, num / denom);
}

/**
 * Extracted features for ML-style ranking. All normalized 0–1 where applicable.
 */
export interface VideoFeatures {
  // A. Retention
  completionRate: number;
  averageWatchSecondsPerView: number;
  watchTimeQuality: number; /// avgWatchSecPerView / max(10, durationSec), clamped 0–1
  replayRate: number;
  skipRate: number;
  completedViewsCount: number;
  totalWatchSeconds: number;
  replayBoost: number; /// min(0.2, replayCount * 0.03) — retention signal
  retentionSkipPenalty: number; /// min(0.25, skipCount * 0.03) — retention signal

  // B. Engagement
  likeRate: number;
  commentRate: number;
  shareRate: number;
  shareVelocity: number; /// shares in last 24h, normalized; viral boost signal

  // B+. Growth (APPROXIMATE proxy, not true growth)
  /**
   * Approximate creator reach signal, currently normalized followersCount.
   * This is NOT real follower growth over time and should not be interpreted as such.
   * Replace later with true time-windowed delta metrics (see comments below).
   */
  followerGrowthProxy: number;

  // C. Support
  giftCoinsPerView: number;
  /** Soft boost from For You + live gift velocity (time-decayed), not challenge scoring. */
  forYouGiftBoost: number;
  voteRate: number;

  // D. Talent / Creator
  talentScore: number;
  creatorQualityScore: number;

  // E. Context
  ageHours: number;
  challengeRelevance: number;
  categoryMatch: number;
  creatorMatch: number;
  styleMatch: number;
  contentTypeAffinity: number;
  skipPenalty: number; // 0–1 from negative category (skip patterns)

  // F. Safety
  moderationPenalty: number;
  reportRate: number;

  // G. Vote score (confidence-weighted star rating)
  /** 0–1. averageStars influence with voteCount weight. Small samples damped. */
  voteScore: number;
  voteScoreAverageStars: number;
  voteScoreCount: number;
}

export function extractFeatures(
  v: CandidateVideo,
  affinity: UserAffinity,
  maxValues: {
    likes: number;
    comments: number;
    shares: number;
    sharesLast24h?: number;
    coins: number;
    views: number;
    followers?: number;
  },
  now: Date
): VideoFeatures {
  const ws = v.watchStats;
  const viewCount = ws?.viewCount ?? 0;
  const views = Math.max(1, v.viewsCount);

  // Retention: real watch data (viewCount) is primary. Views are FALLBACK only — never use raw views for ranking.
  const completionRate =
    viewCount > 0 ? safeRatio(ws!.completedViewsCount, viewCount) : safeRatio(v.likesCount + v.commentsCount, views) * 0.2;
  const avgWatchSec = viewCount > 0 ? ws!.totalWatchSeconds / Math.max(1, viewCount) : 0;
  const durationSec = Math.max(10, v.durationSec ?? VIDEO_LIMITS.STANDARD);
  const watchTimeQuality = Math.min(1, Math.max(0, avgWatchSec / durationSec));
  const averageWatchSecondsPerView = Math.min(1, avgWatchSec / VIDEO_LIMITS.STANDARD);
  const replayRate = viewCount > 0 ? safeRatio(ws!.replayCount, viewCount) : 0;
  const skipRate = viewCount > 0 ? safeRatio(ws!.skipCount, viewCount) : 0;
  const replayCount = ws?.replayCount ?? 0;
  const skipCount = ws?.skipCount ?? 0;
  const replayBoost = replayCount > 0 ? Math.min(0.2, replayCount * 0.03) : 0;
  const retentionSkipPenalty = skipCount > 0 ? Math.min(0.25, skipCount * 0.03) : 0;

  const likeRate = safeRatio(v.likesCount, maxValues.likes);
  const commentRate = safeRatio(v.commentsCount, maxValues.comments);
  const shareRate = safeRatio(v.sharesCount, maxValues.shares);
  const shareVelocity = safeRatio(v.sharesLast24h ?? 0, Math.max(1, maxValues.sharesLast24h ?? 1));

  /**
   * followerGrowthProxy (current behavior):
   * - Uses creatorFollowersCount normalized by max followers in candidate set.
   * - This is an approximation of reach/size, not growth velocity.
   * - Kept for backward compatibility until real growth telemetry exists.
   *
   * Real implementation would require:
   * 1) Time-series follower snapshots (per creator) at fixed intervals.
   * 2) Windowed deltas (e.g. 24h/7d follower gain) and growth rate normalization.
   * 3) Optional anti-spike / anti-abuse smoothing (bot/fraud filtered follower changes).
   */
  const maxFollowers = (maxValues as { followers?: number }).followers ?? 10000;
  const followerGrowthProxy = safeRatio(v.creatorFollowersCount ?? 0, Math.max(1, maxFollowers));

  const giftCoinsPerView = safeRatio(v.coinsCount, Math.max(1, v.viewsCount)) * 10;
  const forYouGiftBoost = Math.min(
    1,
    Math.log1p(Math.max(0, v.forYouGiftCoinsTotal ?? 0)) / 12 + Math.max(0, v.recentGiftVelocity ?? 0) / 120
  );
  const voteRate = safeRatio(v.votesCount, Math.max(1, v.viewsCount)) * 5;

  const talentScore = v.talentScore != null ? Math.min(1, v.talentScore / 10) : 0.5;
  const creatorQualityScore =
    v.creatorVideosCount <= 3 ? 0.7 : Math.min(1, completionRate * 0.6 + (commentRate + likeRate) * 0.2);

  const ageHours = (now.getTime() - v.createdAt.getTime()) / (60 * 60 * 1000);
  const challengeRelevance = v.challengeId != null ? 1 : 0;
  // NOTE: challengeRelevance = participation only (0/1). NOT challenge star vote score.
  // Product decision: challenge votes strongly affect challenge ranking, but do not dominate For You.
  const categoryAffinity = affinity.preferredCategoryIds.has(v.categoryId)
    ? affinity.categoryAffinityScores.get(v.categoryId) ?? 0.5
    : 0;
  const skipPenalty = affinity.negativeCategoryIds.has(v.categoryId)
    ? affinity.negativeCategoryScores.get(v.categoryId) ?? 0.5
    : 0;
  const categoryMatch = Math.max(0, categoryAffinity - skipPenalty);
  const creatorMatch = affinity.preferredCreatorIds.has(v.creatorId)
    ? affinity.creatorAffinityScores.get(v.creatorId) ?? 0.5
    : 0;
  const styleMatch =
    affinity.preferredStyleSlugs.size > 0 && v.performanceStyle && affinity.preferredStyleSlugs.has(v.performanceStyle)
      ? 1
      : 0;
  const contentTypeAffinity = 0.5;

  const moderationPenalty = v.reportCount > 0 || v.isFlagged ? 1 : 0;
  const reportRate = Math.min(1, v.reportCount / 5);

  // Vote score: averageStars with confidence weight (voteCount). Small samples damped.
  const starVote = v.starVote;
  const talentAvg = v.talentScore != null ? v.talentScore / 10 : 0;
  const talentCount = v.votesCount ?? 0;
  const avgStars = starVote?.averageStars != null ? (starVote.averageStars - 1) / 4 : talentAvg;
  const voteCount = starVote?.votesCount ?? talentCount;
  const MIN_VOTES_FOR_FULL_WEIGHT = 10;
  const confidenceWeight = voteCount <= 0 ? 0 : Math.min(1, voteCount / MIN_VOTES_FOR_FULL_WEIGHT);
  const voteScore = avgStars * confidenceWeight;

  return {
    completionRate,
    averageWatchSecondsPerView,
    watchTimeQuality,
    replayRate,
    skipRate,
    replayBoost,
    retentionSkipPenalty,
    completedViewsCount: ws?.completedViewsCount ?? 0,
    totalWatchSeconds: ws?.totalWatchSeconds ?? 0,
    likeRate,
    commentRate,
    shareRate,
    shareVelocity,
    followerGrowthProxy,
    giftCoinsPerView: Math.min(1, giftCoinsPerView),
    forYouGiftBoost,
    voteRate: Math.min(1, voteRate),
    talentScore,
    creatorQualityScore,
    ageHours,
    challengeRelevance,
    categoryMatch,
    creatorMatch,
    styleMatch,
    contentTypeAffinity,
    skipPenalty,
    moderationPenalty,
    reportRate,
    voteScore,
    voteScoreAverageStars: starVote?.averageStars ?? (v.talentScore ?? 0),
    voteScoreCount: voteCount,
  };
}
