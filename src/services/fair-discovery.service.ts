/**
 * BETALENT Fair Discovery — shared ranking integrity helpers (NOT a black box).
 *
 * Used by For You, Trending, New Voices, and related surfaces. All formulas are explicit;
 * nothing here claims ML/AI. Personalization lives in user-affinity + per-surface assembly.
 *
 * ## What is personalized (elsewhere)
 * - Category/style/creator affinity from likes, follows, watch history (user-affinity.service).
 *
 * ## What this module provides
 * - Caps and dampeners so money/size do not dominate discovery.
 * - Deterministic ordering keys (no random shuffles for “fairness”).
 * - Creator diversity assembly utilities.
 */

import {
  FAIR_DISCOVERY_MEGA_FOLLOWER_REF,
  FAIR_DISCOVERY_MEGA_DAMPEN_MAX,
  FAIR_DISCOVERY_MEGA_DAMPEN_PER_LOG,
  FAIR_DISCOVERY_MEGA_SCORE_FLOOR,
  FAIR_DISCOVERY_UNDEREXPOSED_MAX_MULT,
  FOR_YOU_GIFT_SUPPORT_QUALITY_CAP,
  SESSION_CREATOR_REPEAT_BASE_MULT,
  SESSION_CREATOR_REPEAT_STEP_MULT,
} from '@/constants/ranking';

/** Caps the gift-heavy portion of For You `supportQuality` (vote talent signal uncapped). */
export function capForYouGiftSupportQuality(giftCoinsPerViewTerm: number, forYouGiftTerm: number): number {
  const giftBlend = giftCoinsPerViewTerm + forYouGiftTerm;
  return Math.min(giftBlend, FOR_YOU_GIFT_SUPPORT_QUALITY_CAP);
}

/**
 * Mega-creator dampening: large follower counts reduce score multiplicatively (bounded).
 * Formula: 1 - min(maxDampen, strength * log10(1 + followers/ref)).
 */
export function megaCreatorScoreMultiplier(followersCount: number): number {
  const f = Math.max(0, followersCount);
  const damp = Math.min(
    FAIR_DISCOVERY_MEGA_DAMPEN_MAX,
    FAIR_DISCOVERY_MEGA_DAMPEN_PER_LOG * Math.log10(1 + f / FAIR_DISCOVERY_MEGA_FOLLOWER_REF)
  );
  return Math.max(FAIR_DISCOVERY_MEGA_SCORE_FLOOR, 1 - damp);
}

/**
 * Underexposed discovery boost (bounded). Low views + low followers → slight uplift; saturates for large accounts.
 * Returns multiplicative factor in [1, FAIR_DISCOVERY_UNDEREXPOSED_MAX_MULT].
 */
export function underexposedDiscoveryMultiplier(viewsCount: number, followersCount: number): number {
  const v = Math.log1p(Math.max(0, viewsCount));
  const f = Math.log1p(Math.max(0, followersCount));
  const exposure = (v + f * 2) / 22;
  if (exposure >= 1) return 1;
  const bump = (1 - exposure) * (FAIR_DISCOVERY_UNDEREXPOSED_MAX_MULT - 1);
  return 1 + bump;
}

/** Deterministic “exploration” ordering: lower historical exposure first, then stable id tie-break. */
export function explorationExposureMetric(followersCount: number, viewsCount: number): number {
  return Math.log1p(Math.max(0, followersCount)) * 2 + Math.log1p(Math.max(0, viewsCount));
}

export function sortCandidatesForDeterministicExploration<
  T extends { id: string; creatorFollowersCount: number; viewsCount: number; score: number },
>(items: T[], minScore: number): T[] {
  const eligible = items.filter((x) => x.score >= minScore);
  return [...eligible].sort((a, b) => {
    const ea = explorationExposureMetric(a.creatorFollowersCount, a.viewsCount);
    const eb = explorationExposureMetric(b.creatorFollowersCount, b.viewsCount);
    if (ea !== eb) return ea - eb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Session creator repetition multiplier (For You). Stronger than legacy 0.2 step.
 */
export function sessionCreatorRepetitionMultiplier(sessionCount: number): number {
  if (sessionCount <= 0) return 1;
  return Math.max(
    SESSION_CREATOR_REPEAT_BASE_MULT,
    1 - sessionCount * SESSION_CREATOR_REPEAT_STEP_MULT
  );
}

export type CreatorKeyed = { creatorId: string };

/**
 * Greedy take with per-creator cap and optional no-adjacent-same-creator.
 */
export function assembleWithCreatorDiversity<T extends CreatorKeyed>(
  ordered: T[],
  limit: number,
  options: { maxPerCreator: number; avoidAdjacentSameCreator?: boolean }
): T[] {
  const maxPer = options.maxPerCreator;
  const avoidAdj = options.avoidAdjacentSameCreator ?? false;
  const perCreator = new Map<string, number>();
  const out: T[] = [];
  let lastCreator: string | null = null;
  const pool = [...ordered];

  while (out.length < limit && pool.length > 0) {
    let idx = pool.findIndex((item) => {
      const n = perCreator.get(item.creatorId) ?? 0;
      if (n >= maxPer) return false;
      if (avoidAdj && lastCreator != null && item.creatorId === lastCreator) return false;
      return true;
    });
    if (idx < 0) {
      idx = pool.findIndex((item) => (perCreator.get(item.creatorId) ?? 0) < maxPer);
    }
    if (idx < 0) break;
    const [item] = pool.splice(idx, 1);
    out.push(item);
    perCreator.set(item.creatorId, (perCreator.get(item.creatorId) ?? 0) + 1);
    lastCreator = item.creatorId;
  }
  return out;
}

/**
 * Trending: cap weighted gift velocity vs other weighted activity so pay-to-win cannot dominate.
 * giftWeighted / (gift + nonGift) ≤ maxGiftShare after cap.
 */
/**
 * Following feed: interleave creators so one heavy uploader does not occupy the whole first screen.
 * Input rows must be newest-first per global order; per-creator lists preserve that order.
 */
export function interleaveFollowingFeedVideos<T extends { creatorId: string }>(videos: T[], limit: number): T[] {
  const by = new Map<string, T[]>();
  for (const v of videos) {
    const list = by.get(v.creatorId) ?? [];
    list.push(v);
    by.set(v.creatorId, list);
  }
  const creators = Array.from(by.keys()).sort((a, b) => a.localeCompare(b));
  const out: T[] = [];
  while (out.length < limit) {
    let added = false;
    for (const c of creators) {
      if (out.length >= limit) break;
      const list = by.get(c);
      if (list?.length) {
        out.push(list.shift()!);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

export function capTrendingWeightedGiftShare(
  giftWeighted: number,
  nonGiftWeighted: number,
  maxGiftShare: number
): number {
  const g = Math.max(0, giftWeighted);
  const n = Math.max(0, nonGiftWeighted);
  const total = g + n;
  if (total <= 0) return 0;
  if (g / total <= maxGiftShare) return total;
  const cappedGift = (maxGiftShare / (1 - maxGiftShare)) * n;
  return cappedGift + n;
}
