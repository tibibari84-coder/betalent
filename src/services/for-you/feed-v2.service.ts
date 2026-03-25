/**
 * For You V2 — Orchestrator
 * Multi-stage pipeline: Candidates → Features → Scoring → Reranking → Final Assembly.
 *
 * Personalized: category/style/creator affinity from real watch/like/follow signals (user-affinity).
 * Not personalized: exploration slots use deterministic underexposed ordering — not random shuffle, not “AI”.
 */

import { prisma } from '@/lib/prisma';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/feed-cache';
import { getChallengeVoteSummaryByVideoIds } from '@/services/challenge-vote.service';
import { getUserAffinity } from '@/services/user-affinity.service';
import {
  getWatchedVideoIds,
  getRecentlyWatchedVideoIds,
} from '@/services/watch-progress.service';
import {
  FOR_YOU_PERSONALIZED_SHARE,
  FOR_YOU_EXPLORATION_SHARE,
  FOR_YOU_PERSONALIZED_MIX,
  FOR_YOU_EXPLORATION_MIX,
  FOR_YOU_EXPLORATION_RANDOM_SHARE,
  FOR_YOU_MAX_CHALLENGE_SHARE,
  FOR_YOU_FRESH_HOURS,
  FEED_MAX_VIDEOS_PER_CREATOR,
  NEW_CREATOR_UPLOAD_LIMIT,
  LIGHTWEIGHT_SCORE_CAP,
} from '@/constants/ranking';
import { generateCandidates, type CandidateBucket } from './candidates.service';
import { extractFeatures, type CandidateVideo, type VideoFeatures } from './features.service';
import { computePrimaryScore } from './scoring.service';
import { getEarlyDistributionStatus } from './early-distribution.service';
import { computeLightweightScore } from './lightweight-scoring.service';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import {
  megaCreatorScoreMultiplier,
  underexposedDiscoveryMultiplier,
  sessionCreatorRepetitionMultiplier,
  sortCandidatesForDeterministicExploration,
} from '@/services/fair-discovery.service';

const baseWhere = CANONICAL_PUBLIC_VIDEO_WHERE;

export interface ForYouV2Params {
  userId?: string | null;
  sessionCreatorIds?: string[];
  limit?: number;
  debug?: boolean;
}

/** Score breakdown for debug/validation. Exposed when debug=true. */
export interface ScoreBreakdown {
  retentionScore: number;
  engagementScore: number;
  supportScore: number;
  finalScore: number;
  rank: number;
  bucket: string;
  replayCount: number;
  skipCount: number;
  completionRate: number;
  viewsCount: number;
  completedViewsCount: number;
  viewCount: number; // watchStats.viewCount (samples with progress)
  earlyDistPhase?: string;
  earlyDistMultiplier?: number;
  voteScore: number;
  voteScoreAverageStars: number;
  voteScoreCount: number;
}

export interface ScoredCandidate {
  id: string;
  creatorId: string;
  categoryId: string;
  challengeId: string | null;
  bucket: CandidateBucket;
  score: number;
  createdAt: Date;
  creatorVideosCount: number;
  isFresh: boolean;
  isNewCreator: boolean;
  isStyleMatch: boolean;
  isRising: boolean;
  explanation?: Record<string, number>;
  scoreBreakdown?: ScoreBreakdown;
}

function isChallengeActive(c: { startAt: Date; endAt: Date; status: string }, now: Date): boolean {
  const t = now.getTime();
  return (
    ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE'].includes(c.status) &&
    t >= c.startAt.getTime() &&
    t <= c.endAt.getTime()
  );
}

/**
 * Fetch full video records for candidate IDs and build CandidateVideo shape.
 */
async function fetchCandidateVideos(
  candidateIds: string[],
  now: Date
): Promise<Map<string, CandidateVideo & { challengeId: string | null; creatorVideosCount: number; creatorFollowersCount: number; rankingBoostMultiplier: number | null }>> {
  const videos = await prisma.video.findMany({
    where: { id: { in: candidateIds }, ...baseWhere },
    select: {
      id: true,
      creatorId: true,
      categoryId: true,
      performanceStyle: true,
      contentType: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      sharesLast24h: true,
      coinsCount: true,
      viewsCount: true,
      votesCount: true,
      talentScore: true,
      reportCount: true,
      isFlagged: true,
      createdAt: true,
      durationSec: true,
      rankingBoostMultiplier: true,
      creator: {
        select: {
          _count: { select: { videos: true } },
          followersCount: true,
        },
      },
      supportStats: {
        select: {
          forYouGiftCoinsTotal: true,
          recentGiftVelocity: true,
        },
      },
      watchStats: true,
      challengeEntries: {
        select: {
          challengeId: true,
          challenge: { select: { startAt: true, endAt: true, status: true } },
        },
      },
    },
  });

  const starVoteByVideo = await getChallengeVoteSummaryByVideoIds(candidateIds);

  const map = new Map<string, CandidateVideo & { challengeId: string | null; creatorVideosCount: number; creatorFollowersCount: number; rankingBoostMultiplier: number | null }>();
  for (const v of videos) {
    const activeEntry = v.challengeEntries.find((e) =>
      isChallengeActive(e.challenge, now)
    );
    const starVote = starVoteByVideo.get(v.id);
    map.set(v.id, {
      id: v.id,
      creatorId: v.creatorId,
      categoryId: v.categoryId,
      performanceStyle: v.performanceStyle,
      contentType: v.contentType,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount,
      sharesCount: v.sharesCount,
      sharesLast24h: v.sharesLast24h,
      coinsCount: v.coinsCount,
      forYouGiftCoinsTotal: v.supportStats?.forYouGiftCoinsTotal ?? 0,
      recentGiftVelocity: v.supportStats?.recentGiftVelocity ?? 0,
      viewsCount: v.viewsCount,
      votesCount: v.votesCount,
      talentScore: v.talentScore,
      reportCount: v.reportCount,
      isFlagged: v.isFlagged,
      createdAt: v.createdAt,
      durationSec: v.durationSec,
      creatorVideosCount: v.creator._count.videos,
      creatorFollowersCount: v.creator.followersCount ?? 0,
      watchStats: v.watchStats,
      challengeId: activeEntry?.challengeId ?? null,
      rankingBoostMultiplier: v.rankingBoostMultiplier ?? null,
      starVote: starVote ? { averageStars: starVote.averageStars, votesCount: starVote.votesCount } : null,
    });
  }
  return map;
}

/**
 * For You V2 feed — full pipeline.
 * Per-user feed result cached 75s when sessionCreatorIds is empty (initial load).
 */
export async function getForYouFeedV2(params: ForYouV2Params): Promise<{
  videoIds: string[];
  debug?: {
    scored: ScoredCandidate[];
    diagnostics?: {
      candidatePoolSize: number;
      afterLightweightFilter: number;
      scoredCount: number;
      outputSize: number;
      fairDiscovery: Record<string, string>;
    };
  };
}> {
  const limit = Math.min(params.limit ?? 30, 50);
  const sessionCreatorIds = params.sessionCreatorIds ?? [];
  const creatorCounts = new Map<string, number>();
  for (const id of sessionCreatorIds) {
    creatorCounts.set(id, (creatorCounts.get(id) ?? 0) + 1);
  }

  const cacheKey =
    !params.debug && sessionCreatorIds.length === 0
      ? `for-you:${params.userId ?? 'anon'}:${limit}`
      : null;
  if (cacheKey) {
    const cached = cacheGet<{ videoIds: string[] }>(cacheKey);
    if (cached) return cached;
  }

  const [affinity, watchedVideoIds, recentlyWatchedVideoIds] = await Promise.all([
    getUserAffinity(params.userId ?? null),
    params.userId ? getWatchedVideoIds(params.userId) : Promise.resolve(new Set<string>()),
    params.userId ? getRecentlyWatchedVideoIds(params.userId) : Promise.resolve(new Set<string>()),
  ]);

  const now = new Date();

  // ─── Stage A: Candidate Generation ─────────────────────────────────────────
  const candidates = await generateCandidates({
    userId: params.userId ?? null,
    preferredCategoryIds: affinity.preferredCategoryIds,
    preferredCreatorIds: affinity.preferredCreatorIds,
    preferredStyleSlugs: affinity.preferredStyleSlugs,
    recentlyWatchedIds: recentlyWatchedVideoIds,
    now,
  });

  const candidateIds = Array.from(new Set(candidates.map((c) => c.videoId))).slice(0, 1500);
  const bucketByVideo = new Map(candidates.map((c) => [c.videoId, c.bucket]));

  if (candidateIds.length === 0) return { videoIds: [] };

  // ─── Stage B: Fetch + Lightweight Scoring (fast filter) ─────────────────────
  const videoMap = await fetchCandidateVideos(candidateIds, now);

  const maxLikes = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.likesCount));
  const maxComments = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.commentsCount));
  const maxShares = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.sharesCount));
  const maxSharesLast24h = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.sharesLast24h ?? 0));
  const maxCoins = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.coinsCount));
  const maxViews = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.viewsCount));
  const maxFollowers = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.creatorFollowersCount ?? 0));

  const lightweightMaxValues = {
    likes: maxLikes,
    comments: maxComments,
    shares: maxShares,
    sharesLast24h: maxSharesLast24h,
    coins: maxCoins,
    views: maxViews,
    followers: maxFollowers,
  };

  const lightweightScored = Array.from(videoMap.entries())
    .map(([id, v]) => ({
      id,
      score: computeLightweightScore(
        {
          id: v.id,
          creatorId: v.creatorId,
          categoryId: v.categoryId,
          likesCount: v.likesCount,
          commentsCount: v.commentsCount,
          sharesCount: v.sharesCount,
          sharesLast24h: v.sharesLast24h ?? 0,
          coinsCount: v.coinsCount,
          forYouGiftCoinsTotal: v.forYouGiftCoinsTotal ?? 0,
          recentGiftVelocity: v.recentGiftVelocity ?? 0,
          viewsCount: v.viewsCount,
          createdAt: v.createdAt,
          reportCount: v.reportCount,
          isFlagged: v.isFlagged,
        },
        lightweightMaxValues,
        now
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, LIGHTWEIGHT_SCORE_CAP);

  const finalCandidateIds = lightweightScored.map((x) => x.id);
  const filteredVideoMap = new Map(
    finalCandidateIds.map((id) => {
      const v = videoMap.get(id)!;
      return [id, v];
    })
  );

  // ─── Stage C: Full Feature Extraction + Final Scoring ──────────────────────
  const maxValues = lightweightMaxValues;

  const freshCutoffMs = now.getTime() - FOR_YOU_FRESH_HOURS * 60 * 60 * 1000;

  const scored: ScoredCandidate[] = [];
  for (const id of finalCandidateIds) {
    const v = filteredVideoMap.get(id);
    if (!v) continue;

    const features = extractFeatures(v, affinity, maxValues, now);
    const { score, explanation } = computePrimaryScore(
      features,
      v.creatorVideosCount,
      params.debug ?? false
    );

    const categoryMatch = affinity.preferredCategoryIds.has(v.categoryId);
    const styleMatch =
      affinity.preferredStyleSlugs.size > 0 &&
      v.performanceStyle != null &&
      affinity.preferredStyleSlugs.has(v.performanceStyle);

    let finalScore = score;
    if (params.userId && watchedVideoIds.has(id)) finalScore *= 0.5;
    if (params.userId && affinity.negativeCategoryIds.has(v.categoryId)) finalScore *= 0.7;
    if (v.reportCount > 0 || v.isFlagged) finalScore *= 0.5;
    const boostMult = v.rankingBoostMultiplier;
    if (boostMult != null && boostMult > 0) finalScore *= boostMult;

    const sessionRepetition = creatorCounts.get(v.creatorId) ?? 0;
    finalScore *= sessionCreatorRepetitionMultiplier(sessionRepetition);

    finalScore *= megaCreatorScoreMultiplier(v.creatorFollowersCount ?? 0);
    finalScore *= underexposedDiscoveryMultiplier(v.viewsCount, v.creatorFollowersCount ?? 0);

    const earlyDist = getEarlyDistributionStatus({
      watchStats: v.watchStats,
      ageHours: features.ageHours,
    });
    finalScore *= earlyDist.multiplier;

    const retentionScore =
      features.completionRate * 0.5 +
      features.averageWatchSecondsPerView * 0.3 +
      (1 - features.skipRate) * 0.2 +
      Math.min(0.1, features.replayRate * 2);
    const engagementScore =
      features.likeRate * 0.32 +
      features.commentRate * 0.28 +
      features.shareRate * 0.18 +
      features.shareVelocity * 0.14 +
      // Approximate reach proxy (normalized followers), not real follower growth metric.
      features.followerGrowthProxy * 0.08;
    const supportScore =
      features.giftCoinsPerView * 0.52 + features.voteRate * 0.33 + features.forYouGiftBoost * 0.15;

    const ws = v.watchStats;
    const bucket = bucketByVideo.get(id) ?? 'fallback';
    const scoreBreakdown: ScoreBreakdown | undefined =
      params.debug ?? false
        ? {
            retentionScore,
            engagementScore,
            supportScore,
            finalScore,
            rank: 0, // set when building debug output
            bucket,
            replayCount: ws?.replayCount ?? 0,
            skipCount: ws?.skipCount ?? 0,
            completionRate: features.completionRate,
            viewsCount: v.viewsCount,
            completedViewsCount: ws?.completedViewsCount ?? 0,
            viewCount: ws?.viewCount ?? 0,
            earlyDistPhase: earlyDist.phase,
            earlyDistMultiplier: earlyDist.multiplier,
            voteScore: features.voteScore,
            voteScoreAverageStars: features.voteScoreAverageStars,
            voteScoreCount: features.voteScoreCount,
          }
        : undefined;

    scored.push({
      id,
      creatorId: v.creatorId,
      categoryId: v.categoryId,
      challengeId: v.challengeId,
      bucket: bucketByVideo.get(id) ?? 'fallback',
      score: finalScore,
      createdAt: v.createdAt,
      creatorVideosCount: v.creatorVideosCount,
      isFresh: v.createdAt.getTime() >= freshCutoffMs,
      isNewCreator: v.creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT,
      isStyleMatch: categoryMatch || styleMatch,
      isRising: v.creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT,
      explanation: explanation as Record<string, number> | undefined,
      scoreBreakdown,
    });
  }

  // ─── Stage C & D: 80/20 Split + Reranking ────────────────────────────────────
  const personalizedSlots = Math.max(1, Math.round(limit * FOR_YOU_PERSONALIZED_SHARE));
  const explorationSlots = Math.max(2, limit - personalizedSlots);

  const rankingOrdered = [...scored].sort((a, b) => b.score - a.score);
  const styleMatchOrdered = scored
    .filter((s) => s.isStyleMatch)
    .sort((a, b) => b.score - a.score);
  const risingOrdered = scored
    .filter((s) => s.isRising)
    .sort((a, b) => b.score - a.score);
  const freshOrdered = scored
    .filter((s) => s.isFresh)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const challengeOrdered = scored
    .filter((s) => s.challengeId != null)
    .sort((a, b) => b.score - a.score);
  const otherOrdered = scored
    .filter((s) => !s.isStyleMatch)
    .sort((a, b) => b.score - a.score);

  const personalizedSlotCounts = {
    ranking: Math.round(personalizedSlots * FOR_YOU_PERSONALIZED_MIX.ranking),
    styleMatch: Math.round(personalizedSlots * FOR_YOU_PERSONALIZED_MIX.styleMatch),
  };
  const randomExplorationSlots = Math.max(1, Math.round(explorationSlots * FOR_YOU_EXPLORATION_RANDOM_SHARE));
  const curatedExplorationSlots = explorationSlots - randomExplorationSlots;

  const explorationSlotCounts = {
    random: randomExplorationSlots,
    rising: Math.round(curatedExplorationSlots * FOR_YOU_EXPLORATION_MIX.rising),
    fresh: Math.round(curatedExplorationSlots * FOR_YOU_EXPLORATION_MIX.fresh),
    challenge: Math.round(curatedExplorationSlots * FOR_YOU_EXPLORATION_MIX.challenge),
    other: Math.round(curatedExplorationSlots * FOR_YOU_EXPLORATION_MIX.other),
  };

  const usedIds = new Set<string>();
  const usedCreators = new Map(creatorCounts);
  const usedChallenges = new Map<string, number>();
  const usedCategories = new Map<string, number>();
  const result: string[] = [];
  let lastCreatorId: string | null = null;
  let lastCategoryId: string | null = null;

  const maxChallengeVideos = Math.ceil(limit * FOR_YOU_MAX_CHALLENGE_SHARE);
  const maxCreatorVideos = FEED_MAX_VIDEOS_PER_CREATOR;
  const maxCategoryInRow = 2;

  const canAdd = (s: ScoredCandidate): boolean => {
    if (usedIds.has(s.id)) return false;
    if ((usedCreators.get(s.creatorId) ?? 0) >= maxCreatorVideos) return false;
    if (s.challengeId && (usedChallenges.get(s.challengeId) ?? 0) >= maxChallengeVideos) return false;
    return true;
  };

  const takeNext = (
    list: ScoredCandidate[],
    preferDifferentCreator: boolean,
    preferDifferentCategory: boolean
  ): ScoredCandidate | null => {
    const candidates = list.filter((s) => canAdd(s));
    if (preferDifferentCreator && lastCreatorId != null) {
      const different = candidates.find((s) => s.creatorId !== lastCreatorId);
      if (different) return different;
    }
    if (preferDifferentCategory && lastCategoryId != null) {
      const different = candidates.find((s) => s.categoryId !== lastCategoryId);
      if (different) return different;
    }
    return candidates[0] ?? null;
  };

  const add = (s: ScoredCandidate) => {
    usedIds.add(s.id);
    usedCreators.set(s.creatorId, (usedCreators.get(s.creatorId) ?? 0) + 1);
    if (s.challengeId) {
      usedChallenges.set(s.challengeId, (usedChallenges.get(s.challengeId) ?? 0) + 1);
    }
    usedCategories.set(s.categoryId, (usedCategories.get(s.categoryId) ?? 0) + 1);
    result.push(s.id);
    lastCreatorId = s.creatorId;
    lastCategoryId = s.categoryId;
  };

  const personalizedLists = {
    ranking: rankingOrdered,
    styleMatch: styleMatchOrdered,
  } as const;
  const personalizedKeys: (keyof typeof personalizedSlotCounts)[] = ['ranking', 'styleMatch'];

  let roundIndex = 0;
  while (result.length < personalizedSlots) {
    let added = false;
    const rotatedKeys =
      roundIndex === 0
        ? personalizedKeys
        : [
            ...personalizedKeys.slice(roundIndex % personalizedKeys.length),
            ...personalizedKeys.slice(0, roundIndex % personalizedKeys.length),
          ];
    for (const key of rotatedKeys) {
      if (result.length >= personalizedSlots) break;
      if (personalizedSlotCounts[key] <= 0) continue;
      const list = personalizedLists[key];
      const s = takeNext(list, result.length > 0, result.length > 0);
      if (s) {
        add(s);
        personalizedSlotCounts[key]--;
        added = true;
      }
    }
    if (!added) break;
    roundIndex += 1;
  }

  if (result.length < personalizedSlots) {
    const rest = rankingOrdered.filter((s) => canAdd(s));
    for (const s of rest) {
      if (result.length >= personalizedSlots) break;
      const preferDiff =
        lastCreatorId != null && s.creatorId === lastCreatorId;
      const other = preferDiff ? rest.find((x) => canAdd(x) && x.creatorId !== lastCreatorId) : null;
      add(other ?? s);
    }
  }

  const scoredByIdForExplore = new Map(scored.map((s) => [s.id, s]));
  const deterministicExplorationOrdered: ScoredCandidate[] = sortCandidatesForDeterministicExploration(
    scored.map((s) => {
      const vrow = filteredVideoMap.get(s.id)!;
      return {
        id: s.id,
        creatorId: s.creatorId,
        creatorFollowersCount: vrow.creatorFollowersCount ?? 0,
        viewsCount: vrow.viewsCount,
        score: s.score,
      };
    }),
    0
  ).map((x) => scoredByIdForExplore.get(x.id)!);

  const explorationLists = {
    random: deterministicExplorationOrdered,
    rising: risingOrdered,
    fresh: freshOrdered,
    challenge: challengeOrdered,
    other: otherOrdered,
  } as const;
  const explorationKeys: (keyof typeof explorationSlotCounts)[] = [
    'random',
    'rising',
    'fresh',
    'challenge',
    'other',
  ];

  roundIndex = 0;
  while (result.length < limit) {
    let added = false;
    const rotatedKeys =
      roundIndex === 0
        ? explorationKeys
        : [
            ...explorationKeys.slice(roundIndex % explorationKeys.length),
            ...explorationKeys.slice(0, roundIndex % explorationKeys.length),
          ];
    for (const key of rotatedKeys) {
      if (result.length >= limit) break;
      if (explorationSlotCounts[key] <= 0) continue;
      const list = explorationLists[key];
      const s = takeNext(list, result.length > 0, result.length > 0);
      if (s) {
        add(s);
        explorationSlotCounts[key]--;
        added = true;
      }
    }
    if (!added) break;
    roundIndex += 1;
  }

  if (result.length < limit) {
    const rest = scored.filter((s) => canAdd(s)).sort((a, b) => b.score - a.score);
    for (const s of rest) {
      if (result.length >= limit) break;
      const preferDiff = lastCreatorId != null && s.creatorId === lastCreatorId;
      const other = preferDiff ? rest.find((x) => canAdd(x) && x.creatorId !== lastCreatorId) : null;
      add(other ?? s);
    }
  }

  const scoredById = new Map(scored.map((s) => [s.id, s]));

  const out: {
    videoIds: string[];
    debug?: {
      scored: ScoredCandidate[];
      diagnostics?: {
        candidatePoolSize: number;
        afterLightweightFilter: number;
        scoredCount: number;
        outputSize: number;
        fairDiscovery: Record<string, string>;
      };
    };
  } = {
    videoIds: result,
  };
  if (params.debug) {
    out.debug = {
      scored: result
        .map((id, i) => {
          const s = scoredById.get(id);
          if (!s) return null;
          const rank = i + 1;
          const b = s.scoreBreakdown;
          return {
            ...s,
            scoreBreakdown: b ? { ...b, rank } : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null) as ScoredCandidate[],
      diagnostics: {
        candidatePoolSize: candidateIds.length,
        afterLightweightFilter: finalCandidateIds.length,
        scoredCount: scored.length,
        outputSize: result.length,
        fairDiscovery: {
          giftSupportCap: 'FOR_YOU_GIFT_SUPPORT_QUALITY_CAP + LIGHTWEIGHT_GIFT_BLEND_CAP',
          megaCreatorDampen: 'megaCreatorScoreMultiplier',
          underexposedBoost: 'underexposedDiscoveryMultiplier',
          explorationOrdering: 'deterministic underexposed sort (replaces Math.random)',
        },
      },
    };
    logRankingBreakdown(scored.slice(0, 10));
  }
  if (cacheKey) {
    cacheSet(cacheKey, { videoIds: result }, CACHE_TTL.FEED);
  }
  return out;
}

const DEBUG_RANKING = process.env.DEBUG_RANKING === '1' || process.env.NODE_ENV === 'development';

/** Debug: log ranking breakdown for top N videos. Enable with DEBUG_RANKING=1 or NODE_ENV=development. */
function logRankingBreakdown(scored: ScoredCandidate[]): void {
  if (!DEBUG_RANKING) return;
  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    const b = s.scoreBreakdown;
    const ex = s.explanation;
    if (!b) continue;
    const parts = [
      `#${i + 1}`,
      `video=${s.id}`,
      `score=${b.finalScore.toFixed(4)}`,
      `retention=${b.retentionScore.toFixed(3)}`,
      `completion=${(b.completionRate * 100).toFixed(0)}%`,
      `replay=${b.replayCount}`,
      `skip=${b.skipCount}`,
      `views=${b.viewsCount}`,
    ];
    if (ex) {
      parts.push(
        `retQ=${(ex.retentionQuality ?? 0).toFixed(2)}`,
        `engQ=${(ex.engagementQuality ?? 0).toFixed(2)}`,
        `persAff=${(ex.personalizationAffinity ?? 0).toFixed(2)}`,
        `decay=${(ex.decayMultiplier ?? 0).toFixed(2)}`,
        `voteScore=${(ex.voteScore ?? 0).toFixed(3)}`,
        `voteAvg=${ex.voteScoreAverageStars ?? 0}`,
        `voteN=${ex.voteScoreCount ?? 0}`
      );
    }
    console.debug(`[Ranking] ${parts.join(' ')}`);
  }
}

export interface TopVideoWithBreakdown {
  videoId: string;
  title: string;
  creatorUsername: string;
  viewsCount: number;
  likesCount: number;
  scoreBreakdown: ScoreBreakdown;
  fullExplanation?: Record<string, number>;
}

/**
 * Get top ranked videos with full score breakdown. For debug/validation.
 * Use ?compare=id1,id2 for side-by-side comparison of 2 videos.
 */
export async function getTopVideosWithBreakdown(params: {
  limit?: number;
  compareIds?: [string, string];
}): Promise<{ videos: TopVideoWithBreakdown[] }> {
  const limit = params.limit ?? 20;
  const [affinity, recentlyWatchedIds] = await Promise.all([
    getUserAffinity(null),
    Promise.resolve(new Set<string>()),
  ]);

  const now = new Date();
  const candidates = await generateCandidates({
    userId: null,
    preferredCategoryIds: affinity.preferredCategoryIds,
    preferredCreatorIds: affinity.preferredCreatorIds,
    preferredStyleSlugs: affinity.preferredStyleSlugs,
    recentlyWatchedIds,
    now,
  });

  let candidateIds = Array.from(new Set(candidates.map((c) => c.videoId))).slice(0, 1500);
  if (params.compareIds && params.compareIds.length === 2) {
    candidateIds = params.compareIds;
  }

  if (candidateIds.length === 0) return { videos: [] };

  const videoMap = await fetchCandidateVideos(candidateIds, now);
  const maxLikes = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.likesCount));
  const maxComments = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.commentsCount));
  const maxShares = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.sharesCount));
  const maxSharesLast24h = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.sharesLast24h ?? 0));
  const maxCoins = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.coinsCount));
  const maxViews = Math.max(1, ...Array.from(videoMap.values()).map((v) => v.viewsCount));
  const maxValues = {
    likes: maxLikes,
    comments: maxComments,
    shares: maxShares,
    sharesLast24h: maxSharesLast24h,
    coins: maxCoins,
    views: maxViews,
  };

  const bucketByVideo = new Map(candidates.map((c) => [c.videoId, c.bucket]));
  const scored: ScoredCandidate[] = [];

  for (const id of candidateIds) {
    const v = videoMap.get(id);
    if (!v) continue;

    const features = extractFeatures(v, affinity, maxValues, now);
    const { score, explanation } = computePrimaryScore(features, v.creatorVideosCount, true);

    let finalScore = score;
    if (v.reportCount > 0 || v.isFlagged) finalScore *= 0.5;

    const earlyDist = getEarlyDistributionStatus({
      watchStats: v.watchStats,
      ageHours: features.ageHours,
    });
    finalScore *= earlyDist.multiplier;

    const retentionScore =
      features.completionRate * 0.5 +
      features.averageWatchSecondsPerView * 0.3 +
      (1 - features.skipRate) * 0.2 +
      Math.min(0.1, features.replayRate * 2);
    const engagementScore =
      features.likeRate * 0.32 +
      features.commentRate * 0.28 +
      features.shareRate * 0.18 +
      features.shareVelocity * 0.14 +
      // Approximate reach proxy (normalized followers), not real follower growth metric.
      features.followerGrowthProxy * 0.08;
    const supportScore =
      features.giftCoinsPerView * 0.52 + features.voteRate * 0.33 + features.forYouGiftBoost * 0.15;

    const ws = v.watchStats;
    const bucket = bucketByVideo.get(id) ?? 'fallback';
    scored.push({
      id,
      creatorId: v.creatorId,
      categoryId: v.categoryId,
      challengeId: v.challengeId,
      bucket,
      score: finalScore,
      createdAt: v.createdAt,
      creatorVideosCount: v.creatorVideosCount,
      isFresh: false,
      isNewCreator: v.creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT,
      isStyleMatch: false,
      isRising: v.creatorVideosCount <= NEW_CREATOR_UPLOAD_LIMIT,
      explanation: explanation as Record<string, number> | undefined,
      scoreBreakdown: {
        retentionScore,
        engagementScore,
        supportScore,
        finalScore,
        rank: 0,
        bucket,
        replayCount: ws?.replayCount ?? 0,
        skipCount: ws?.skipCount ?? 0,
        completionRate: features.completionRate,
        viewsCount: v.viewsCount,
        completedViewsCount: ws?.completedViewsCount ?? 0,
        viewCount: ws?.viewCount ?? 0,
        earlyDistPhase: earlyDist.phase,
        earlyDistMultiplier: earlyDist.multiplier,
        voteScore: features.voteScore,
        voteScoreAverageStars: features.voteScoreAverageStars,
        voteScoreCount: features.voteScoreCount,
      },
    });
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = params.compareIds
    ? sorted.filter((s) => params.compareIds!.includes(s.id))
    : sorted.slice(0, limit);

  const videoDetails = await prisma.video.findMany({
    where: { id: { in: top.map((s) => s.id) } },
    select: {
      id: true,
      title: true,
      creator: { select: { username: true } },
      viewsCount: true,
      likesCount: true,
    },
  });

  const byId = new Map(videoDetails.map((vd) => [vd.id, vd]));

  const videos: TopVideoWithBreakdown[] = top
    .filter((s): s is ScoredCandidate & { scoreBreakdown: ScoreBreakdown } => s.scoreBreakdown != null)
    .map((s, i) => {
      const vd = byId.get(s.id);
      return {
        videoId: s.id,
        title: vd?.title ?? '(unknown)',
        creatorUsername: vd?.creator.username ?? '(unknown)',
        viewsCount: s.scoreBreakdown.viewsCount,
        likesCount: vd?.likesCount ?? 0,
        scoreBreakdown: { ...s.scoreBreakdown, rank: i + 1 },
        fullExplanation: s.explanation,
      };
    });

  return { videos };
}

/** Full ranking signals for a single video. For debug/inspection. */
export interface VideoRankingSignals {
  videoId: string;
  title: string;
  creatorUsername: string;
  bucket: CandidateBucket;
  scoreBreakdown: ScoreBreakdown;
  fullExplanation: Record<string, number>;
  features: {
    completionRate: number;
    skipRate: number;
    replayRate: number;
    categoryMatch: number;
    creatorMatch: number;
    styleMatch: number;
    ageHours: number;
    challengeRelevance: number;
    voteScore: number;
    voteScoreAverageStars: number;
    voteScoreCount: number;
  };
}

/**
 * Get full ranking signals for a single video. For debug/validation.
 */
export async function getVideoRankingSignals(
  videoId: string,
  userId?: string | null
): Promise<VideoRankingSignals | null> {
  const [affinity, videoMap] = await Promise.all([
    getUserAffinity(userId ?? null),
    fetchCandidateVideos([videoId], new Date()),
  ]);

  const v = videoMap.get(videoId);
  if (!v) return null;

  const now = new Date();
  const maxValues = {
    likes: Math.max(1, v.likesCount),
    comments: Math.max(1, v.commentsCount),
    shares: Math.max(1, v.sharesCount),
    sharesLast24h: Math.max(1, v.sharesLast24h ?? 0),
    coins: Math.max(1, v.coinsCount),
    views: Math.max(1, v.viewsCount),
  };

  const features = extractFeatures(v, affinity, maxValues, now);
  const { score, explanation } = computePrimaryScore(features, v.creatorVideosCount, true);

  let finalScore = score;
  if (v.reportCount > 0 || v.isFlagged) finalScore *= 0.5;

  const earlyDist = getEarlyDistributionStatus({
    watchStats: v.watchStats,
    ageHours: features.ageHours,
  });
  finalScore *= earlyDist.multiplier;

  const retentionScore =
    features.completionRate * 0.5 +
    features.averageWatchSecondsPerView * 0.3 +
    (1 - features.skipRate) * 0.2 +
    Math.min(0.1, features.replayRate * 2);
  const engagementScore =
    features.likeRate * 0.32 +
    features.commentRate * 0.28 +
    features.shareRate * 0.18 +
    features.shareVelocity * 0.14 +
    // Approximate reach proxy (normalized followers), not real follower growth metric.
    features.followerGrowthProxy * 0.08;
  const supportScore =
    features.giftCoinsPerView * 0.52 + features.voteRate * 0.33 + features.forYouGiftBoost * 0.15;

  const ws = v.watchStats;
  const bucket = 'fallback';

  const videoDetail = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      title: true,
      creator: { select: { username: true } },
    },
  });

  return {
    videoId,
    title: videoDetail?.title ?? '(unknown)',
    creatorUsername: videoDetail?.creator.username ?? '(unknown)',
    bucket,
    scoreBreakdown: {
      retentionScore,
      engagementScore,
      supportScore,
      finalScore,
      rank: 0,
      bucket,
      replayCount: ws?.replayCount ?? 0,
      skipCount: ws?.skipCount ?? 0,
      completionRate: features.completionRate,
      viewsCount: v.viewsCount,
      completedViewsCount: ws?.completedViewsCount ?? 0,
      viewCount: ws?.viewCount ?? 0,
      earlyDistPhase: earlyDist.phase,
      earlyDistMultiplier: earlyDist.multiplier,
      voteScore: features.voteScore,
      voteScoreAverageStars: features.voteScoreAverageStars,
      voteScoreCount: features.voteScoreCount,
    },
    fullExplanation: (explanation ?? {}) as Record<string, number>,
    features: {
      completionRate: features.completionRate,
      skipRate: features.skipRate,
      replayRate: features.replayRate,
      categoryMatch: features.categoryMatch,
      creatorMatch: features.creatorMatch,
      styleMatch: features.styleMatch,
      ageHours: features.ageHours,
      challengeRelevance: features.challengeRelevance,
      voteScore: features.voteScore,
      voteScoreAverageStars: features.voteScoreAverageStars,
      voteScoreCount: features.voteScoreCount,
    },
  };
}
