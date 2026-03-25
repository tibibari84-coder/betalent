/**
 * BETALENT user taste vector – time-decayed preferences for For You personalization.
 *
 * Signals (all with time-decay: recent > old):
 * - Category affinity: likes, high-completion watches (≥70%)
 * - Creator affinity: follows, likes, high-completion watches
 * - Watch behavior patterns: avg completion tendency, rewatch rate
 * - Skip patterns: fast skips (<20%) → negative category affinity
 *
 * Cached 120s per user to reduce DB load.
 */

import { prisma } from '@/lib/prisma';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/feed-cache';
import {
  AFFINITY_HALF_LIFE_HOURS,
  AFFINITY_LIMIT,
  POSITIVE_WATCH_PCT,
  SKIP_WATCH_PCT,
} from '@/constants/affinity';

export interface UserAffinity {
  preferredCategoryIds: Set<string>;
  negativeCategoryIds: Set<string>;
  preferredCreatorIds: Set<string>;
  preferredStyleSlugs: Set<string>;
  /** Category affinity 0–1 (time-decayed). */
  categoryAffinityScores: Map<string, number>;
  /** Creator affinity 0–1 (time-decayed). */
  creatorAffinityScores: Map<string, number>;
  /** Negative category affinity 0–1 (time-decayed skip patterns). */
  negativeCategoryScores: Map<string, number>;
  /** Watch behavior: avg completion tendency 0–1. */
  avgCompletionTendency: number;
  /** Rewatch rate: 0–1 (share of watches that were rewatches). */
  rewatchRate: number;
  /** Share of watches that were high-completion (≥70%). */
  highCompletionRatio: number;
}

/** Time-decay weight: 2^(-ageHours / halfLife). Recent = higher. */
export function timeDecayWeight(ageHours: number, halfLifeHours = AFFINITY_HALF_LIFE_HOURS): number {
  if (ageHours <= 0) return 1;
  return Math.pow(2, -ageHours / halfLifeHours);
}

function toCacheable(r: UserAffinity): Record<string, unknown> {
  return {
    preferredCategoryIds: Array.from(r.preferredCategoryIds),
    negativeCategoryIds: Array.from(r.negativeCategoryIds),
    preferredCreatorIds: Array.from(r.preferredCreatorIds),
    preferredStyleSlugs: Array.from(r.preferredStyleSlugs),
    categoryAffinityScores: Array.from(r.categoryAffinityScores.entries()),
    creatorAffinityScores: Array.from(r.creatorAffinityScores.entries()),
    negativeCategoryScores: Array.from(r.negativeCategoryScores.entries()),
    avgCompletionTendency: r.avgCompletionTendency,
    rewatchRate: r.rewatchRate,
    highCompletionRatio: r.highCompletionRatio,
  };
}

function fromCacheable(c: Record<string, unknown>): UserAffinity {
  return {
    preferredCategoryIds: new Set((c.preferredCategoryIds as string[]) ?? []),
    negativeCategoryIds: new Set((c.negativeCategoryIds as string[]) ?? []),
    preferredCreatorIds: new Set((c.preferredCreatorIds as string[]) ?? []),
    preferredStyleSlugs: new Set((c.preferredStyleSlugs as string[]) ?? []),
    categoryAffinityScores: new Map((c.categoryAffinityScores as [string, number][]) ?? []),
    creatorAffinityScores: new Map((c.creatorAffinityScores as [string, number][]) ?? []),
    negativeCategoryScores: new Map((c.negativeCategoryScores as [string, number][]) ?? []),
    avgCompletionTendency: (c.avgCompletionTendency as number) ?? 0.5,
    rewatchRate: (c.rewatchRate as number) ?? 0,
    highCompletionRatio: (c.highCompletionRatio as number) ?? 0,
  };
}

export async function getUserAffinity(userId: string | null): Promise<UserAffinity> {
  const result: UserAffinity = {
    preferredCategoryIds: new Set(),
    negativeCategoryIds: new Set(),
    preferredCreatorIds: new Set(),
    preferredStyleSlugs: new Set(),
    categoryAffinityScores: new Map(),
    creatorAffinityScores: new Map(),
    negativeCategoryScores: new Map(),
    avgCompletionTendency: 0.5,
    rewatchRate: 0,
    highCompletionRatio: 0,
  };

  if (!userId) return result;

  const cacheKey = `affinity:${userId}`;
  const cached = cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return fromCacheable(cached);

  const now = new Date();

  const [likes, follows, watchInteractions] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      take: AFFINITY_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, video: { select: { categoryId: true, creatorId: true, performanceStyle: true } } },
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      take: AFFINITY_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, creatorId: true },
    }),
    prisma.userWatchInteraction.findMany({
      where: { userId },
      take: AFFINITY_LIMIT,
      orderBy: { lastWatchedAt: 'desc' },
      select: {
        lastWatchedAt: true,
        completedPct: true,
        isRewatch: true,
        video: { select: { categoryId: true, creatorId: true, performanceStyle: true } },
      },
    }),
  ]);

  const categoryWeights = new Map<string, number>();
  const creatorWeights = new Map<string, number>();
  const negativeWeights = new Map<string, number>();
  let totalCompletion = 0;
  let completionCount = 0;
  let rewatchCount = 0;
  let highCompletionCount = 0;

  for (const l of likes) {
    if (!l.video) continue;
    const ageHours = (now.getTime() - l.createdAt.getTime()) / (60 * 60 * 1000);
    const w = timeDecayWeight(ageHours);
    categoryWeights.set(l.video.categoryId, (categoryWeights.get(l.video.categoryId) ?? 0) + w * 1.5);
    creatorWeights.set(l.video.creatorId, (creatorWeights.get(l.video.creatorId) ?? 0) + w * 1.5);
    result.preferredCategoryIds.add(l.video.categoryId);
    result.preferredCreatorIds.add(l.video.creatorId);
    if (l.video.performanceStyle) result.preferredStyleSlugs.add(l.video.performanceStyle);
  }

  for (const f of follows) {
    const ageHours = (now.getTime() - f.createdAt.getTime()) / (60 * 60 * 1000);
    const w = timeDecayWeight(ageHours);
    creatorWeights.set(f.creatorId, (creatorWeights.get(f.creatorId) ?? 0) + w * 2);
    result.preferredCreatorIds.add(f.creatorId);
  }

  for (const wi of watchInteractions) {
    const ageHours = (now.getTime() - wi.lastWatchedAt.getTime()) / (60 * 60 * 1000);
    const decay = timeDecayWeight(ageHours);
    if (!wi.video) continue;

    const isPositive = wi.completedPct >= POSITIVE_WATCH_PCT;
    const isSkip = wi.completedPct < SKIP_WATCH_PCT;

    if (isPositive) {
      const weight = decay * 2;
      categoryWeights.set(wi.video.categoryId, (categoryWeights.get(wi.video.categoryId) ?? 0) + weight);
      creatorWeights.set(wi.video.creatorId, (creatorWeights.get(wi.video.creatorId) ?? 0) + weight);
      result.preferredCategoryIds.add(wi.video.categoryId);
      result.preferredCreatorIds.add(wi.video.creatorId);
      if (wi.video.performanceStyle) result.preferredStyleSlugs.add(wi.video.performanceStyle);
    }

    if (isSkip) {
      const weight = decay * 1.5;
      negativeWeights.set(wi.video.categoryId, (negativeWeights.get(wi.video.categoryId) ?? 0) + weight);
      result.negativeCategoryIds.add(wi.video.categoryId);
    }

    totalCompletion += wi.completedPct * decay;
    completionCount += decay;
    if (wi.isRewatch) rewatchCount += decay;
    if (wi.completedPct >= POSITIVE_WATCH_PCT) highCompletionCount += decay;
  }

  const maxCat = Math.max(1, ...Array.from(categoryWeights.values()));
  for (const [catId, w] of Array.from(categoryWeights.entries())) {
    result.categoryAffinityScores.set(catId, Math.min(1, w / maxCat));
  }

  const maxCreator = Math.max(1, ...Array.from(creatorWeights.values()));
  for (const [creatorId, w] of Array.from(creatorWeights.entries())) {
    result.creatorAffinityScores.set(creatorId, Math.min(1, w / maxCreator));
  }

  const maxNeg = Math.max(1, ...Array.from(negativeWeights.values()));
  for (const [catId, w] of Array.from(negativeWeights.entries())) {
    result.negativeCategoryScores.set(catId, Math.min(1, w / maxNeg));
  }

  if (completionCount > 0) {
    result.avgCompletionTendency = Math.min(1, totalCompletion / completionCount);
    result.rewatchRate = Math.min(1, rewatchCount / completionCount);
    result.highCompletionRatio = Math.min(1, highCompletionCount / completionCount);
  }

  cacheSet(cacheKey, toCacheable(result), CACHE_TTL.AFFINITY);
  return result;
}
