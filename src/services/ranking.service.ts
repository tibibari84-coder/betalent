/**
 * BETALENT ranking and discovery – score calculation, For You feed, Trending, Challenge ranking.
 *
 * NOT vanity-optimized: raw views and raw likes are weak. Central: retention, support, explicit intent, diversity.
 * Uses: watch retention/completion, super votes, gift support, engagement (share > comment > like), freshness.
 * Ensures creator diversity, new creator discovery boost, and anti-spam (self-vote excluded in data).
 *
 * Assembly map (routes → modules): `docs/RANKING-ASSEMBLY.md`.
 */

import { prisma } from '@/lib/prisma';
import { VIDEO_LIMITS } from '@/constants/video-limits';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/feed-cache';
import { getConfirmedFraudSupportSourceIds } from '@/services/fraud-risk.service';
import { getForYouFeedV2 } from '@/services/for-you/feed-v2.service';
import { assembleWithCreatorDiversity, capTrendingWeightedGiftShare } from '@/services/fair-discovery.service';
import {
  RANKING_WEIGHTS,
  SUPPORT_WEIGHTS,
  ENGAGEMENT_WEIGHTS,
  FRESHNESS_HOURS_24,
  FRESHNESS_DAYS_7,
  NEW_CREATOR_UPLOAD_LIMIT,
  NEW_CREATOR_DISCOVERY_BOOST,
  FEED_MAX_VIDEOS_PER_CREATOR,
  FOR_YOU_WATCHED_MULTIPLIER,
  FOR_YOU_SKIP_CATEGORY_PENALTY,
  FOR_YOU_COMPLETION_CATEGORY_BOOST,
  FOR_YOU_HIGH_COMPLETION_BOOST,
  FOR_YOU_REPLAY_BOOST,
  FOR_YOU_SKIP_PENALTY,
  FOR_YOU_WATCH_TIME_QUALITY_WEIGHT,
  FOR_YOU_MIN_WATCH_SAMPLE,
  FOR_YOU_NEW_UPLOAD_BOOST_HOURS,
  FOR_YOU_NEW_UPLOAD_BOOST,
  FOR_YOU_HALFLIFE_HOURS,
  FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS,
  FOR_YOU_CATEGORY_AFFINITY_BOOST,
  FOR_YOU_PERSONALIZED_SHARE,
  FOR_YOU_EXPLORATION_SHARE,
  FOR_YOU_PERSONALIZED_MIX,
  FOR_YOU_EXPLORATION_MIX,
  FOR_YOU_FRESH_HOURS,
  FOR_YOU_WEIGHTS,
  FOR_YOU_MAX_CHALLENGE_SHARE,
  CHALLENGE_RANKING_WEIGHTS,
  CHALLENGE_DYNAMICS,
  TREND_WEIGHTS_VELOCITY,
  TREND_MIN_ENGAGEMENT_IN_WINDOW,
  TRENDING_CANDIDATE_CAP,
  TRENDING_MAX_GIFT_VELOCITY_SHARE,
  TREND_LIFETIME_VIEW_DAMPEN_STRENGTH,
  MOMENTUM_WINDOW_HOURS,
  GIFT_TIER_WEIGHTS,
  ANTI_SPAM_SELF_VOTE_EXCLUDE,
  FOR_YOU_GIFT_SIGNAL_NORM_MAX,
} from '@/constants/ranking';

export type RankingScores = {
  rankingScore: number;
  watchTimeScore: number;
  engagementScore: number;
  supportScore: number;
  freshnessScore: number;
  momentumScore: number;
};

function safeRatio(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(1, num / denom);
}

/**
 * Watch time proxy when no per-view data: completion proxy from engagement.
 * High completion rate (when VideoWatchStats exists) → strong boost in ranking; short watch → weaker signal.
 */
function watchTimeProxy(viewsCount: number, likesCount: number, commentsCount: number): number {
  if (viewsCount <= 0) return 0.5;
  return Math.min(1, ((likesCount + commentsCount) / viewsCount) * 5);
}

/** Anti-spam: support from others only (exclude self-vote). Excludes confirmed-fraud support (challenge fairness). */
async function getSupportExcludingSelf(
  videoId: string,
  creatorId: string,
  excludedSourceIds?: Set<string>
): Promise<{ superVotes: number; giftCoins: number }> {
  const excludeIds = excludedSourceIds && excludedSourceIds.size > 0 ? Array.from(excludedSourceIds) : [];
  if (!ANTI_SPAM_SELF_VOTE_EXCLUDE) {
    const support = await prisma.videoSupportStats.findUnique({
      where: { videoId },
      select: { totalSuperVotes: true, totalCoinsEarned: true },
    });
    const giftWhere = excludeIds.length ? { videoId, id: { notIn: excludeIds } } : { videoId };
    const giftCoins = await prisma.giftTransaction.aggregate({
      where: giftWhere,
      _sum: { coinAmount: true },
    });
    return {
      superVotes: support?.totalSuperVotes ?? 0,
      giftCoins: giftCoins._sum.coinAmount ?? support?.totalCoinsEarned ?? 0,
    };
  }
  const coinWhere = {
    videoId,
    type: 'RECEIVED_VOTES' as const,
    toUserId: creatorId,
    fromUserId: { not: creatorId },
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };
  const giftWhere = {
    videoId,
    senderId: { not: creatorId },
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };
  const [superVoteCount, giftSum] = await Promise.all([
    prisma.coinTransaction.count({ where: coinWhere }),
    prisma.giftTransaction.aggregate({ where: giftWhere, _sum: { coinAmount: true } }),
  ]);
  return {
    superVotes: superVoteCount,
    giftCoins: giftSum._sum.coinAmount ?? 0,
  };
}

/** Weighted gift score: premium gifts (e.g. Golden Score) contribute more than basic (Music Note). */
function computeWeightedGiftScore(
  giftBreakdown: Array<{ count: number; gift: { slug: string; coinCost: number } }>
): number {
  return giftBreakdown.reduce(
    (sum, g) => sum + g.count * g.gift.coinCost * (GIFT_TIER_WEIGHTS[g.gift.slug] ?? 1),
    0
  );
}

/** Momentum: rapid engagement in last MOMENTUM_WINDOW_HOURS → 0–1 score. Excludes confirmed-fraud support. */
async function getMomentumScore(
  videoId: string,
  creatorId: string,
  excludedSourceIds?: Set<string>
): Promise<number> {
  const since = new Date(Date.now() - MOMENTUM_WINDOW_HOURS * 60 * 60 * 1000);
  const excludeIds = excludedSourceIds && excludedSourceIds.size > 0 ? Array.from(excludedSourceIds) : [];
  const coinWhere = {
    videoId,
    type: 'RECEIVED_VOTES' as const,
    toUserId: creatorId,
    fromUserId: { not: creatorId },
    createdAt: { gte: since },
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };
  const giftWhere = {
    videoId,
    senderId: { not: creatorId },
    createdAt: { gte: since },
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };
  const [likesInWindow, commentsInWindow, superVotesInWindow, giftsInWindow] = await Promise.all([
    prisma.like.count({ where: { videoId, createdAt: { gte: since } } }),
    prisma.comment.count({ where: { videoId, createdAt: { gte: since } } }),
    prisma.coinTransaction.aggregate({ where: coinWhere, _count: { id: true } }),
    prisma.giftTransaction.aggregate({ where: giftWhere, _sum: { coinAmount: true } }),
  ]);
  const activity =
    likesInWindow * 1 +
    commentsInWindow * 2 +
    superVotesInWindow._count.id * 5 +
    (giftsInWindow._sum.coinAmount ?? 0) * 0.1;
  const maxReasonable = 200;
  return Math.min(1, activity / maxReasonable);
}

/** Freshness score 0–1: newer = higher. 24h = max, 7d = moderate, then decay. */
function freshnessScore(createdAt: Date, now: Date): number {
  const hours = (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
  if (hours <= FRESHNESS_HOURS_24) return 1;
  if (hours <= FRESHNESS_DAYS_7) return 0.7 - (hours - FRESHNESS_HOURS_24) / (FRESHNESS_DAYS_7 - FRESHNESS_HOURS_24) * 0.2;
  return Math.max(0, 0.5 - (hours - FRESHNESS_DAYS_7) / (30 * 24)) * 0.5;
}

/** New upload boost: 1 + boost when age < N hours, else 1. */
function newUploadBoost(createdAt: Date, now: Date): number {
  const hours = (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
  return hours <= FOR_YOU_NEW_UPLOAD_BOOST_HOURS ? 1 + FOR_YOU_NEW_UPLOAD_BOOST : 1;
}

/**
 * Half-life decay (Reddit/HN style). Every HALFLIFE_HOURS, freshness influence halves.
 * Strong retention + support + engagement can counterbalance decay.
 */
function halfLifeDecayMultiplier(
  createdAt: Date,
  now: Date,
  retentionNorm: number,
  supportNorm: number,
  engagementNorm: number
): number {
  const ageHours = (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
  const decay = Math.pow(0.5, ageHours / FOR_YOU_HALFLIFE_HOURS);
  const w = FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS;
  const counterbalance = Math.min(
    1,
    w.retention * retentionNorm + w.support * supportNorm + w.engagement * engagementNorm
  );
  return Math.min(1, decay + (1 - decay) * counterbalance);
}

/** Normalize value to [0,1] given max (avoid div by zero). */
function norm(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, value / max);
}

/**
 * Compute ranking score components for one video (and optional support/watch stats).
 * Used to populate VideoRankingStats. When supportFromOthers/weightedGiftScore/momentumScore
 * are provided (e.g. from anti-spam and momentum helpers), they override raw support/momentum.
 */
export function computeRankingScore(params: {
  video: {
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    createdAt: Date;
    creatorId: string;
  };
  creatorVideosCount?: number;
  supportStats?: {
    totalSuperVotes: number;
    totalCoinsEarned: number;
    forYouGiftCoinsTotal?: number;
    recentGiftVelocity?: number;
  } | null;
  /** When set, use these instead of supportStats (anti-spam: exclude self-vote). */
  supportFromOthers?: { superVotes: number; giftCoins: number };
  /** When set, use for gift part of support (premium gifts = stronger boost). */
  weightedGiftScore?: number;
  watchStats?: { totalWatchSeconds: number; completedViewsCount: number; viewCount: number } | null;
  /** When set, use for momentum (rapid engagement in last window). */
  momentumScoreOverride?: number;
  maxValues?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    superVotes: number;
    giftCoins: number;
  };
}): RankingScores {
  const { video, supportStats, watchStats, creatorVideosCount = 0 } = params;
  const now = new Date();
  const support = params.supportFromOthers ?? (supportStats ? { superVotes: supportStats.totalSuperVotes, giftCoins: supportStats.totalCoinsEarned } : { superVotes: 0, giftCoins: 0 });
  const giftForNorm = params.weightedGiftScore ?? support.giftCoins;
  const max = params.maxValues ?? {
    views: Math.max(1, video.viewsCount),
    likes: Math.max(1, video.likesCount),
    comments: Math.max(1, video.commentsCount),
    shares: Math.max(1, video.sharesCount),
    superVotes: Math.max(1, support.superVotes),
    giftCoins: Math.max(1, giftForNorm),
  };

  const watchTimeRaw = watchStats?.viewCount
    ? safeRatio(watchStats.completedViewsCount, watchStats.viewCount) +
      safeRatio(watchStats.totalWatchSeconds, Math.max(1, video.viewsCount) * VIDEO_LIMITS.STANDARD)
    : watchTimeProxy(video.viewsCount, video.likesCount, video.commentsCount);
  const watchTimeScore = Math.min(1, watchTimeRaw);

  const forYouRaw =
    supportStats?.forYouGiftCoinsTotal != null || supportStats?.recentGiftVelocity != null
      ? Math.log1p(Math.max(0, supportStats?.forYouGiftCoinsTotal ?? 0)) * 0.4 +
        Math.max(0, supportStats?.recentGiftVelocity ?? 0) * 0.06
      : 0;
  const forYouNorm = norm(forYouRaw, FOR_YOU_GIFT_SIGNAL_NORM_MAX);

  const supportScore =
    SUPPORT_WEIGHTS.superVote * norm(support.superVotes, max.superVotes) +
    SUPPORT_WEIGHTS.giftCoins * norm(giftForNorm, max.giftCoins) +
    SUPPORT_WEIGHTS.forYouGiftSignal * forYouNorm;
  const supportNorm = Math.min(
    1,
    supportScore /
      (SUPPORT_WEIGHTS.superVote + SUPPORT_WEIGHTS.giftCoins + SUPPORT_WEIGHTS.forYouGiftSignal)
  );

  const engagementScore =
    ENGAGEMENT_WEIGHTS.like * norm(video.likesCount, max.likes) +
    ENGAGEMENT_WEIGHTS.comment * norm(video.commentsCount, max.comments) +
    ENGAGEMENT_WEIGHTS.share * norm(video.sharesCount, max.shares);
  const engagementNorm = Math.min(1, engagementScore / (ENGAGEMENT_WEIGHTS.like + ENGAGEMENT_WEIGHTS.comment + ENGAGEMENT_WEIGHTS.share));

  const fresh = freshnessScore(video.createdAt, now);
  const newCreatorBoost = creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT ? NEW_CREATOR_DISCOVERY_BOOST : 1;
  const freshnessScoreVal = Math.min(1, fresh * (creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT ? 1.2 : 1));

  const momentumScore = params.momentumScoreOverride ?? 0.5;

  const rankingScore =
    (RANKING_WEIGHTS.watchTime * watchTimeScore +
      RANKING_WEIGHTS.supportScore * supportNorm +
      RANKING_WEIGHTS.engagementScore * engagementNorm +
      RANKING_WEIGHTS.freshnessScore * freshnessScoreVal +
      RANKING_WEIGHTS.momentumScore * momentumScore) *
    newCreatorBoost;

  return {
    rankingScore,
    watchTimeScore,
    engagementScore: engagementNorm,
    supportScore: supportNorm,
    freshnessScore: freshnessScoreVal,
    momentumScore,
  };
}

/**
 * Upsert VideoRankingStats for one video. Call after support/engagement changes or in batch job.
 * Uses support-from-others (anti-spam), excludes confirmed-fraud support (challenge fairness), weighted gift score, momentum.
 */
export async function upsertVideoRankingStats(videoId: string): Promise<void> {
  const video = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: {
      id: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
      creatorId: true,
      creator: { select: { _count: { select: { videos: true } } } },
      supportStats: true,
      watchStats: true,
      giftCountByType: { select: { count: true, gift: { select: { slug: true, coinCost: true } } } },
    },
  });
  if (!video) return;

  const excludedFraudIds = await getConfirmedFraudSupportSourceIds();
  const [supportFromOthers, momentumScore] = await Promise.all([
    ANTI_SPAM_SELF_VOTE_EXCLUDE
      ? getSupportExcludingSelf(videoId, video.creatorId, excludedFraudIds)
      : Promise.resolve(null),
    getMomentumScore(videoId, video.creatorId, excludedFraudIds),
  ]);

  const weightedGiftScore =
    video.giftCountByType.length > 0
      ? computeWeightedGiftScore(video.giftCountByType as Array<{ count: number; gift: { slug: string; coinCost: number } }>)
      : undefined;

  const scores = computeRankingScore({
    video: {
      viewsCount: video.viewsCount,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      createdAt: video.createdAt,
      creatorId: video.creatorId,
    },
    creatorVideosCount: video.creator._count.videos,
    supportStats: video.supportStats,
    supportFromOthers: supportFromOthers ?? undefined,
    weightedGiftScore,
    watchStats: video.watchStats ?? undefined,
    momentumScoreOverride: momentumScore,
  });

  await prisma.videoRankingStats.upsert({
    where: { videoId },
    create: {
      videoId,
      rankingScore: scores.rankingScore,
      watchTimeScore: scores.watchTimeScore,
      engagementScore: scores.engagementScore,
      supportScore: scores.supportScore,
      freshnessScore: scores.freshnessScore,
      momentumScore: scores.momentumScore,
    },
    update: {
      rankingScore: scores.rankingScore,
      watchTimeScore: scores.watchTimeScore,
      engagementScore: scores.engagementScore,
      supportScore: scores.supportScore,
      freshnessScore: scores.freshnessScore,
      momentumScore: scores.momentumScore,
      updatedAt: new Date(),
    },
  });
}

/**
 * For You feed — V2 multi-stage pipeline.
 *
 * Stage A: Candidate Generation (explicit buckets)
 * Stage B: Feature Extraction (retention, engagement, support, talent, context, safety)
 * Stage C: Primary Scoring (ML-style weighted ranker)
 * Stage D: Reranking / Feed Shaping (80/20 personalized vs exploration)
 * Stage E: Final Assembly (creator cooldown, category balancing, challenge cap)
 *
 * Delegates to for-you/feed-v2.service.
 */
export async function getForYouFeedRanked(params: {
  userId?: string | null;
  sessionCreatorIds?: string[];
  limit?: number;
}): Promise<{ videoIds: string[] }> {
  const { videoIds } = await getForYouFeedV2({
    userId: params.userId ?? undefined,
    sessionCreatorIds: params.sessionCreatorIds ?? [],
    limit: params.limit ?? 30,
  });
  return { videoIds };
}

/**
 * Trending: highlights performances with rapid engagement growth, high watch completion,
 * rapid gift support, and rapid super vote activity.
 *
 * - Rapid engagement growth: likes and comments in window (per-hour velocity).
 * - High watch completion: real completion from VideoWatchStats when available, else proxy from engagement ratio.
 * - Rapid gift support: gift transactions in window (coin amount per hour).
 * - Rapid super vote activity: RECEIVED_VOTES in window (per hour).
 *
 * Computed per-request so trending updates frequently. Use short windows (3h, 6h) for "Rising now".
 * Score = velocity (per-hour rates) so ranking is comparable across window sizes.
 */
export async function getTrendingRanked(params: {
  windowHours?: number;
  limit?: number;
}): Promise<{ videoIds: string[] }> {
  const windowHours = params.windowHours ?? 24;
  const limit = Math.min(params.limit ?? 30, 50);
  const cacheKey = `trending:${windowHours}:${limit}`;
  const cached = cacheGet<{ videoIds: string[] }>(cacheKey);
  if (cached) return cached;

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // Step 1: Fetch engagement in window only (no Video fetch). Uses indexed createdAt.
  const [likesInWindow, commentsInWindow, giftsInWindow, superVoteTxInWindow] = await Promise.all([
    prisma.like.groupBy({
      by: ['videoId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.comment.groupBy({
      by: ['videoId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.giftTransaction.groupBy({
      by: ['videoId'],
      where: { createdAt: { gte: since }, videoId: { not: null } },
      _sum: { coinAmount: true },
    }),
    prisma.coinTransaction.groupBy({
      by: ['videoId'],
      where: { type: 'RECEIVED_VOTES', videoId: { not: null }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const likesByVideo = new Map(likesInWindow.map((r) => [r.videoId, r._count.id]));
  const commentsByVideo = new Map(commentsInWindow.map((r) => [r.videoId, r._count.id]));
  const giftsByVideo = new Map(giftsInWindow.map((r) => [r.videoId, r._sum.coinAmount ?? 0]));
  const superVotesByVideo = new Map(superVoteTxInWindow.map((r) => [r.videoId, r._sum.amount ?? 0]));

  // Step 2: Union videoIds with engagement, compute velocity-only score, rank, cap at TRENDING_CANDIDATE_CAP.
  const allIds = [
    ...Array.from(likesByVideo.keys()),
    ...Array.from(commentsByVideo.keys()),
    ...Array.from(giftsByVideo.keys()),
    ...Array.from(superVotesByVideo.keys()),
  ].filter((id): id is string => id != null);
  const videoIdsWithEngagement = new Set(allIds);

  const w = TREND_WEIGHTS_VELOCITY;
  const candidateScores = Array.from(videoIdsWithEngagement)
    .map((id) => {
      const likesWin = likesByVideo.get(id) ?? 0;
      const commentsWin = commentsByVideo.get(id) ?? 0;
      const giftsWin = giftsByVideo.get(id) ?? 0;
      const superWin = superVotesByVideo.get(id) ?? 0;
      const engagementInWindow = likesWin + commentsWin + giftsWin + superWin;
      if (engagementInWindow < TREND_MIN_ENGAGEMENT_IN_WINDOW) return null;
      const giftW = w.giftCoinsPerHour * (giftsWin / windowHours);
      const nonGiftW =
        w.superVotesPerHour * (superWin / windowHours) +
        w.likesPerHour * (likesWin / windowHours) +
        w.commentsPerHour * (commentsWin / windowHours);
      const velocityScore = capTrendingWeightedGiftShare(
        giftW,
        nonGiftW,
        TRENDING_MAX_GIFT_VELOCITY_SHARE
      );
      return { id, velocityScore };
    })
    .filter((s): s is { id: string; velocityScore: number } => s !== null)
    .sort((a, b) => b.velocityScore - a.velocityScore)
    .slice(0, TRENDING_CANDIDATE_CAP);

  const topCandidateIds = candidateScores.map((s) => s.id);
  if (topCandidateIds.length === 0) {
    const result = { videoIds: [] };
    cacheSet(cacheKey, result, CACHE_TTL.TRENDING);
    return result;
  }

  // Step 3: Fetch only capped candidates (indexed by id). Max TRENDING_CANDIDATE_CAP rows.
  const videos = await prisma.video.findMany({
    where: {
      id: { in: topCandidateIds },
      ...CANONICAL_PUBLIC_VIDEO_WHERE,
    },
    select: {
      id: true,
      creatorId: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      supportStats: true,
      watchStats: true,
    },
  });

  const videoMap = new Map(videos.map((v) => [v.id, v]));

  // Step 4: Full score (gift-capped activity + completion), lifetime view dampen, then creator-diverse assembly.
  const scored = topCandidateIds
    .map((id) => {
      const v = videoMap.get(id);
      if (!v) return null;
      const likesWin = likesByVideo.get(id) ?? 0;
      const commentsWin = commentsByVideo.get(id) ?? 0;
      const giftsWin = giftsByVideo.get(id) ?? 0;
      const superWin = superVotesByVideo.get(id) ?? 0;
      const giftW = w.giftCoinsPerHour * (giftsWin / windowHours);
      const nonGiftW =
        w.superVotesPerHour * (superWin / windowHours) +
        w.likesPerHour * (likesWin / windowHours) +
        w.commentsPerHour * (commentsWin / windowHours);
      const activity = capTrendingWeightedGiftShare(
        giftW,
        nonGiftW,
        TRENDING_MAX_GIFT_VELOCITY_SHARE
      );
      const completion =
        v.watchStats?.viewCount != null && v.watchStats.viewCount > 0
          ? safeRatio(v.watchStats.completedViewsCount, v.watchStats.viewCount)
          : watchTimeProxy(v.viewsCount, v.likesCount, v.commentsCount);
      const lifetimeDamp =
        1 /
        (1 + TREND_LIFETIME_VIEW_DAMPEN_STRENGTH * Math.log1p(Math.max(0, v.viewsCount)));
      const trendScore = (activity + w.watchCompletionProxy * completion) * lifetimeDamp;
      return { id, creatorId: v.creatorId, trendScore };
    })
    .filter((s): s is { id: string; creatorId: string; trendScore: number } => s !== null)
    .sort((a, b) => b.trendScore - a.trendScore);

  const diversified = assembleWithCreatorDiversity(scored, limit, {
    maxPerCreator: 2,
    avoidAdjacentSameCreator: true,
  });
  const videoIds = diversified.map((s) => s.id);
  if (videoIds.length < limit) {
    const seen = new Set(videoIds);
    for (const s of scored) {
      if (videoIds.length >= limit) break;
      if (!seen.has(s.id)) {
        videoIds.push(s.id);
        seen.add(s.id);
      }
    }
  }
  const result = { videoIds };
  cacheSet(cacheKey, result, CACHE_TTL.TRENDING);
  return result;
}

/**
 * Batch update VideoRankingStats for all READY videos. Call from cron or job for fast feed generation.
 */
export async function updateAllRankingStats(batchSize = 100): Promise<{ updated: number }> {
  const videoIds = await prisma.video.findMany({
    where: CANONICAL_PUBLIC_VIDEO_WHERE,
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  let updated = 0;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    await Promise.all(batch.map((v) => upsertVideoRankingStats(v.id)));
    updated += batch.length;
  }
  return { updated };
}

/**
 * Challenge ranking score: combined formula.
 * Votes matter strongly; retention, support, talent, replay also matter.
 * No single weak metric dominates. All normalized 0–1 over challenge set.
 */
export function computeChallengeRankingScore(entry: {
  video: {
    score: number;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    talentScore?: number | null;
  };
  supportStats?: { totalSuperVotes: number; totalCoinsEarned: number } | null;
  watchStats?: { viewCount: number; completedViewsCount: number; replayCount: number } | null;
  /** Bayesian-weighted star vote score (1–5 scale). From challenge-vote.service. */
  weightedVoteScore?: number;
  maxSuperVotes: number;
  maxGiftCoins: number;
  maxEngagement: number;
  maxLikes: number;
  maxWeightedVoteScore: number;
  maxRetention: number;
  maxReplay: number;
  maxTalentScore: number;
}): number {
  const { video, supportStats, watchStats } = entry;
  const superVotes = supportStats?.totalSuperVotes ?? 0;
  const giftCoins = supportStats?.totalCoinsEarned ?? 0;
  const voteScore = entry.weightedVoteScore ?? 0;
  const engagement = safeRatio(video.likesCount + video.commentsCount, Math.max(1, video.viewsCount));
  const viewCount = watchStats?.viewCount ?? 0;
  const completedViews = watchStats?.completedViewsCount ?? 0;
  const retention = viewCount >= 3 ? safeRatio(completedViews, Math.max(1, viewCount)) : 0;
  const replay = watchStats?.replayCount ?? 0;
  const talentScoreNorm = video.talentScore != null ? Math.min(1, video.talentScore / 10) : 0;
  return (
    CHALLENGE_RANKING_WEIGHTS.starVoteScore * norm(voteScore, Math.max(0.01, entry.maxWeightedVoteScore)) +
    CHALLENGE_RANKING_WEIGHTS.superVotes * norm(superVotes, entry.maxSuperVotes) +
    CHALLENGE_RANKING_WEIGHTS.giftSupport * norm(giftCoins, entry.maxGiftCoins) +
    CHALLENGE_RANKING_WEIGHTS.retentionScore * norm(retention, Math.max(0.01, entry.maxRetention)) +
    CHALLENGE_RANKING_WEIGHTS.replayQuality * norm(replay, Math.max(0.01, entry.maxReplay)) +
    CHALLENGE_RANKING_WEIGHTS.talentScore * norm(talentScoreNorm, Math.max(0.01, entry.maxTalentScore)) +
    CHALLENGE_RANKING_WEIGHTS.engagementRatio * norm(engagement, entry.maxEngagement) +
    CHALLENGE_RANKING_WEIGHTS.likes * norm(video.likesCount, entry.maxLikes)
  );
}

/** Challenge score breakdown for admin/debug. Same inputs as computeChallengeRankingScore. */
export function computeChallengeRankingScoreBreakdown(entry: Parameters<typeof computeChallengeRankingScore>[0]): {
  totalScore: number;
  voteScore: number;
  voteContribution: number;
  superVotesContribution: number;
  giftSupportContribution: number;
  retentionContribution: number;
  replayContribution: number;
  talentContribution: number;
  engagementContribution: number;
  likesContribution: number;
} {
  const { video, supportStats, watchStats } = entry;
  const superVotes = supportStats?.totalSuperVotes ?? 0;
  const giftCoins = supportStats?.totalCoinsEarned ?? 0;
  const voteScore = entry.weightedVoteScore ?? 0;
  const engagement = safeRatio(video.likesCount + video.commentsCount, Math.max(1, video.viewsCount));
  const viewCount = watchStats?.viewCount ?? 0;
  const completedViews = watchStats?.completedViewsCount ?? 0;
  const retention = viewCount >= 3 ? safeRatio(completedViews, Math.max(1, viewCount)) : 0;
  const replay = watchStats?.replayCount ?? 0;
  const talentScoreNorm = video.talentScore != null ? Math.min(1, video.talentScore / 10) : 0;

  const voteContribution = CHALLENGE_RANKING_WEIGHTS.starVoteScore * norm(voteScore, Math.max(0.01, entry.maxWeightedVoteScore));
  const superVotesContribution = CHALLENGE_RANKING_WEIGHTS.superVotes * norm(superVotes, entry.maxSuperVotes);
  const giftSupportContribution = CHALLENGE_RANKING_WEIGHTS.giftSupport * norm(giftCoins, entry.maxGiftCoins);
  const retentionContribution = CHALLENGE_RANKING_WEIGHTS.retentionScore * norm(retention, Math.max(0.01, entry.maxRetention));
  const replayContribution = CHALLENGE_RANKING_WEIGHTS.replayQuality * norm(replay, Math.max(0.01, entry.maxReplay));
  const talentContribution = CHALLENGE_RANKING_WEIGHTS.talentScore * norm(talentScoreNorm, Math.max(0.01, entry.maxTalentScore));
  const engagementContribution = CHALLENGE_RANKING_WEIGHTS.engagementRatio * norm(engagement, entry.maxEngagement);
  const likesContribution = CHALLENGE_RANKING_WEIGHTS.likes * norm(video.likesCount, entry.maxLikes);

  const totalScore =
    voteContribution +
    superVotesContribution +
    giftSupportContribution +
    retentionContribution +
    replayContribution +
    talentContribution +
    engagementContribution +
    likesContribution;

  return {
    totalScore,
    voteScore,
    voteContribution,
    superVotesContribution,
    giftSupportContribution,
    retentionContribution,
    replayContribution,
    talentContribution,
    engagementContribution,
    likesContribution,
  };
}

// ─── Challenge dynamics: time decay, momentum, finalist lock, diversity ───────

/**
 * Time decay multiplier: older entries lose ranking power.
 * multiplier = max(minMultiplier, exp(-ageHours / halfLifeHours))
 */
export function computeChallengeTimeDecayMultiplier(
  ageHours: number,
  isFinalistLocked: boolean
): number {
  if (isFinalistLocked && CHALLENGE_DYNAMICS.finalistLockDisablesDecayAndMomentum) return 1;
  const halfLife = CHALLENGE_DYNAMICS.timeDecayHalfLifeHours;
  const minMult = CHALLENGE_DYNAMICS.timeDecayMinMultiplier;
  const raw = Math.exp(-ageHours / halfLife);
  return Math.max(minMult, Math.min(1, raw));
}

/**
 * Momentum multiplier: boost entries gaining traction fast.
 * momentumSignal = votesLast24h + sharesLast24h (or similar); normalized 0–1 over set.
 * multiplier = 1 + min(maxBoost, normalizedMomentum * maxBoost)
 */
export function computeChallengeMomentumMultiplier(
  normalizedMomentum: number,
  isFinalistLocked: boolean
): number {
  if (isFinalistLocked && CHALLENGE_DYNAMICS.finalistLockDisablesDecayAndMomentum) return 1;
  const boost = Math.min(CHALLENGE_DYNAMICS.momentumMaxBoost, normalizedMomentum * CHALLENGE_DYNAMICS.momentumMaxBoost);
  return 1 + boost;
}

/**
 * Apply creator diversity and style balance when building top N.
 * Cap max entries per creator and per style in top N.
 * Items must have creatorId and optionally styleSlug (for cover challenges).
 */
export function applyChallengeDiversityGuard<T extends { creatorId: string; styleSlug?: string | null }>(
  sorted: T[],
  topN: number,
  options?: { maxPerCreator?: number; maxPerStyle?: number; hasStyles?: boolean }
): T[] {
  const maxCreator = options?.maxPerCreator ?? CHALLENGE_DYNAMICS.creatorDiversityMaxPerCreatorInTop;
  const maxStyle = options?.maxPerStyle ?? CHALLENGE_DYNAMICS.styleBalanceMaxPerStyleInTop;
  const hasStyles = options?.hasStyles ?? false;

  const result: T[] = [];
  const creatorCount = new Map<string, number>();
  const styleCount = new Map<string, number>();

  for (const item of sorted) {
    if (result.length >= topN) break;
    const creatorN = creatorCount.get(item.creatorId) ?? 0;
    const styleKey = item.styleSlug ?? '__none__';
    const styleN = hasStyles ? (styleCount.get(styleKey) ?? 0) : 0;

    if (creatorN >= maxCreator) continue;
    if (hasStyles && styleN >= maxStyle) continue;

    result.push(item);
    creatorCount.set(item.creatorId, creatorN + 1);
    styleCount.set(styleKey, styleN + 1);
  }

  return result;
}
