/**
 * For You V2 — Stage 2: Lightweight Scoring
 * Fast filter before full scoring. Uses only Video fields (no watchStats, no affinity).
 * O(1) per candidate. Reduces candidate pool for expensive Stage 3.
 *
 * Views are FALLBACK only. Score uses engagement rates, support per view, freshness — never raw views.
 */

import {
  LIGHTWEIGHT_HALFLIFE_HOURS,
  LIGHTWEIGHT_WEIGHTS,
  LIGHTWEIGHT_GIFT_BLEND_CAP,
} from '@/constants/ranking';

export type LightweightVideo = {
  id: string;
  creatorId: string;
  categoryId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  sharesLast24h: number;
  coinsCount: number;
  forYouGiftCoinsTotal?: number;
  recentGiftVelocity?: number;
  viewsCount: number;
  createdAt: Date;
  reportCount: number;
  isFlagged: boolean;
};

function safeRatio(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(1, num / denom);
}

/**
 * Compute lightweight score for fast filtering.
 * Formula: engagement + support + growth + freshness_decay
 * No retention (needs watchStats), no personalization (needs affinity).
 */
export function computeLightweightScore(
  v: LightweightVideo,
  maxValues: {
    likes: number;
    comments: number;
    shares: number;
    sharesLast24h: number;
    coins: number;
    views: number;
  },
  now: Date
): number {
  const views = Math.max(1, v.viewsCount);

  const likeRate = safeRatio(v.likesCount, maxValues.likes);
  const commentRate = safeRatio(v.commentsCount, maxValues.comments);
  const shareRate = safeRatio(v.sharesCount, maxValues.shares);
  const shareVelocity = safeRatio(v.sharesLast24h, Math.max(1, maxValues.sharesLast24h));
  const coinPerView = safeRatio(v.coinsCount, views) * 10;
  const forYouBoost = Math.min(
    1,
    Math.log1p(Math.max(0, v.forYouGiftCoinsTotal ?? 0)) / 12 + Math.max(0, v.recentGiftVelocity ?? 0) / 120
  );

  const ageHours = (now.getTime() - v.createdAt.getTime()) / (60 * 60 * 1000);
  const decay = Math.pow(0.5, ageHours / LIGHTWEIGHT_HALFLIFE_HOURS);
  const freshnessFloor = 0.1;
  const freshnessMult = Math.max(freshnessFloor, Math.min(1, decay));

  const engagement = likeRate * 0.4 + commentRate * 0.35 + shareRate * 0.15 + shareVelocity * 0.1;
  const giftBlend = coinPerView * 0.88 + forYouBoost * 0.12;
  const support = Math.min(1, Math.min(LIGHTWEIGHT_GIFT_BLEND_CAP, giftBlend));
  const growth = shareVelocity;

  const w = LIGHTWEIGHT_WEIGHTS;
  let score =
    engagement * w.engagement +
    support * w.support +
    growth * w.growth +
    freshnessMult * w.freshness;

  if (v.reportCount > 0 || v.isFlagged) score *= 0.3;

  return Math.max(0, score);
}
