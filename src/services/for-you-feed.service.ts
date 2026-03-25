/**
 * BETALENT "For You" feed – scoring, tier balancing, diversity, trend boost.
 * See: docs/FOR-YOU-FEED-ALGORITHM.md, constants/feed-algorithm.ts
 */

import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import type { CreatorTier } from '@prisma/client';
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_VIDEOS_PER_CREATOR,
  FEED_TIER_MIX,
  FEED_TIER_ORDER,
  FEED_TREND_BOOST_MULTIPLIER,
  FEED_TREND_MIN_ENGAGEMENT_RATIO,
  FEED_TREND_RECENCY_MS,
  FEED_WEIGHTS_PRIMARY,
  FEED_WEIGHTS_SECONDARY,
  FEED_WEIGHTS_TERTIARY,
} from '@/constants/feed-algorithm';

export interface ForYouFeedInput {
  /** Optional viewer (for future personalization). */
  userId?: string | null;
  /** Creator IDs already shown this session (for diversity). */
  sessionCreatorIds?: string[];
  /** Max videos to return. */
  limit?: number;
}

export interface ForYouFeedResult {
  /** Ranked video IDs for the feed. */
  videoIds: string[];
}

interface Candidate {
  id: string;
  creatorId: string;
  creatorTier: CreatorTier;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  score: number;
  durationSec: number;
  createdAt: Date;
}

function safeRatio(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return num / denom;
}

/** Normalize value to [0,1] with min/max over the candidate set (or use a fixed cap). */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  const v = Math.max(min, Math.min(max, value));
  return (v - min) / (max - min);
}

/** Engagement ratio: (likes + comments) / views. */
function engagementRatio(v: Candidate): number {
  return safeRatio(v.likesCount + v.commentsCount, Math.max(1, v.viewsCount));
}

/** Recency score: newer = higher. Linear in [0,1] by age in ms (cap at 30 days). */
function recencyScore(createdAt: Date, now: Date): number {
  const ageMs = now.getTime() - createdAt.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (ageMs >= thirtyDaysMs) return 0;
  return 1 - ageMs / thirtyDaysMs;
}

/** Whether video qualifies for trend boost (recent + high engagement ratio). */
function isTrending(v: Candidate, now: Date): boolean {
  const ageMs = now.getTime() - v.createdAt.getTime();
  if (ageMs > FEED_TREND_RECENCY_MS) return false;
  return engagementRatio(v) >= FEED_TREND_MIN_ENGAGEMENT_RATIO;
}

/** Compute raw score for one candidate (0–1 scale per signal, then weighted sum). */
function scoreCandidate(
  v: Candidate,
  stats: {
    maxViews: number;
    maxLikes: number;
    maxComments: number;
    maxShares: number;
    maxScore: number;
    maxEngagement: number;
  },
  now: Date
): number {
  const eng = engagementRatio(v);
  const views = Math.max(1, v.viewsCount);

  // Primary: no watch_time/completion – weight goes to votes + engagement
  const votesNorm = normalize(v.score, 0, stats.maxScore);
  const engagementNorm = normalize(eng, 0, stats.maxEngagement);
  const primary =
    FEED_WEIGHTS_PRIMARY.votes * votesNorm +
    FEED_WEIGHTS_PRIMARY.engagementRatio * engagementNorm +
    FEED_WEIGHTS_PRIMARY.watchTime * 0.5 + // neutral when missing
    FEED_WEIGHTS_PRIMARY.completionRate * 0.5;

  // Secondary
  const likesNorm = normalize(v.likesCount, 0, stats.maxLikes);
  const commentsNorm = normalize(v.commentsCount, 0, stats.maxComments);
  const sharesNorm = normalize(v.sharesCount, 0, stats.maxShares);
  const secondary =
    FEED_WEIGHTS_SECONDARY.likes * likesNorm +
    FEED_WEIGHTS_SECONDARY.comments * commentsNorm +
    FEED_WEIGHTS_SECONDARY.shares * sharesNorm;

  // Tertiary
  const tierNorm = FEED_TIER_ORDER[v.creatorTier] / 4; // 0..1
  const recency = recencyScore(v.createdAt, now);
  const tertiary =
    FEED_WEIGHTS_TERTIARY.creatorRank * tierNorm +
    FEED_WEIGHTS_TERTIARY.recency * recency +
    FEED_WEIGHTS_TERTIARY.challengeParticipation * 0.5; // neutral when missing

  let total = primary + secondary + tertiary;
  if (isTrending(v, now)) total *= FEED_TREND_BOOST_MULTIPLIER;
  return total;
}

/** Enforce max N videos per creator in order (keep first N per creator). */
function applyDiversity(
  ordered: Candidate[],
  sessionCounts: Map<string, number>,
  maxPerCreator: number
): Candidate[] {
  const result: Candidate[] = [];
  const counts = new Map(sessionCounts);

  for (const c of ordered) {
    const n = counts.get(c.creatorId) ?? 0;
    if (n >= maxPerCreator) continue;
    result.push(c);
    counts.set(c.creatorId, n + 1);
  }
  return result;
}

/**
 * Get ranked "For You" feed: tier-balanced, diversity-capped, trend-boosted.
 */
export async function getForYouFeed(input: ForYouFeedInput): Promise<ForYouFeedResult> {
  const limit = input.limit ?? FEED_DEFAULT_LIMIT;
  const sessionCreatorIds = input.sessionCreatorIds ?? [];
  const sessionCounts = new Map<string, number>();
  for (const id of sessionCreatorIds) {
    sessionCounts.set(id, (sessionCounts.get(id) ?? 0) + 1);
  }

  const raw = await prisma.video.findMany({
    where: CANONICAL_PUBLIC_VIDEO_WHERE,
    select: {
      id: true,
      creatorId: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      score: true,
      durationSec: true,
      createdAt: true,
      creator: { select: { creatorTier: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  const candidates: Candidate[] = raw.map((v) => ({
    id: v.id,
    creatorId: v.creatorId,
    creatorTier: v.creator.creatorTier,
    viewsCount: v.viewsCount,
    likesCount: v.likesCount,
    commentsCount: v.commentsCount,
    sharesCount: v.sharesCount,
    score: v.score,
    durationSec: v.durationSec,
    createdAt: v.createdAt,
  }));

  if (candidates.length === 0) {
    return { videoIds: [] };
  }

  const maxViews = Math.max(1, ...candidates.map((c) => c.viewsCount));
  const maxLikes = Math.max(1, ...candidates.map((c) => c.likesCount));
  const maxComments = Math.max(1, ...candidates.map((c) => c.commentsCount));
  const maxShares = Math.max(1, ...candidates.map((c) => c.sharesCount));
  const maxScore = Math.max(1, ...candidates.map((c) => c.score));
  const maxEngagement = Math.max(
    0.01,
    ...candidates.map((c) => engagementRatio(c))
  );

  const stats = {
    maxViews,
    maxLikes,
    maxComments,
    maxShares,
    maxScore,
    maxEngagement,
  };
  const now = new Date();

  const withScores = candidates.map((c) => ({
    candidate: c,
    score: scoreCandidate(c, stats, now),
  }));
  withScores.sort((a, b) => b.score - a.score);

  const byTier = new Map<CreatorTier, Candidate[]>();
  for (const { candidate } of withScores) {
    const list = byTier.get(candidate.creatorTier) ?? [];
    list.push(candidate);
    byTier.set(candidate.creatorTier, list);
  }

  const tierOrder: CreatorTier[] = ['RISING', 'FEATURED', 'STARTER', 'SPOTLIGHT', 'GLOBAL'];
  const pooled: Candidate[] = [];
  for (const tier of tierOrder) {
    const share = FEED_TIER_MIX[tier];
    const slotCount = Math.round(limit * share);
    const list = byTier.get(tier) ?? [];
    pooled.push(...list.slice(0, slotCount));
  }
  const remaining = limit - pooled.length;
  if (remaining > 0) {
    const used = new Set(pooled.map((c) => c.id));
    for (const { candidate } of withScores) {
      if (used.has(candidate.id)) continue;
      pooled.push(candidate);
      used.add(candidate.id);
      if (pooled.length >= limit) break;
    }
  }

  const afterDiversity = applyDiversity(
    pooled,
    sessionCounts,
    FEED_MAX_VIDEOS_PER_CREATOR
  );
  const chosenSet = new Set(afterDiversity.map((c) => c.id));
  const fillCandidates = withScores
    .map((x) => x.candidate)
    .filter((c) => !chosenSet.has(c.id));
  const finalOrder = [...afterDiversity];
  const creatorCounts = new Map(sessionCounts);
  for (const c of finalOrder) {
    creatorCounts.set(c.creatorId, (creatorCounts.get(c.creatorId) ?? 0) + 1);
  }
  for (const c of fillCandidates) {
    if (finalOrder.length >= limit) break;
    const n = creatorCounts.get(c.creatorId) ?? 0;
    if (n >= FEED_MAX_VIDEOS_PER_CREATOR) continue;
    finalOrder.push(c);
    creatorCounts.set(c.creatorId, n + 1);
  }

  return {
    videoIds: finalOrder.slice(0, limit).map((c) => c.id),
  };
}
