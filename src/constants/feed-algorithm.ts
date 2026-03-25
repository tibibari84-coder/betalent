/**
 * BETALENT "For You" feed algorithm – weights, tier mix, diversity, trend.
 * See: docs/FOR-YOU-FEED-ALGORITHM.md
 */

import type { CreatorTier } from '@prisma/client';

/** Primary signals: 50% total. When watch_time/completion missing, weight goes to votes + engagement. */
export const FEED_WEIGHTS_PRIMARY = {
  watchTime: 0.15,
  completionRate: 0.10,
  votes: 0.15,
  engagementRatio: 0.10,
} as const;

/** Secondary signals: 30% total */
export const FEED_WEIGHTS_SECONDARY = {
  likes: 0.12,
  shares: 0.08,
  comments: 0.10,
  profileVisits: 0, // no data yet
} as const;

/** Tertiary signals: 20% total */
export const FEED_WEIGHTS_TERTIARY = {
  creatorRank: 0.08,
  challengeParticipation: 0.04,
  recency: 0.08,
} as const;

/** Feed balancing: target share per creator tier (must sum to 1). */
export const FEED_TIER_MIX: Record<CreatorTier, number> = {
  RISING: 0.4,
  FEATURED: 0.25,
  STARTER: 0.2,
  SPOTLIGHT: 0.1,
  GLOBAL: 0.05,
};

/** Max videos per creator per session (diversity). */
export const FEED_MAX_VIDEOS_PER_CREATOR = 3;

/** Recency boost: videos newer than this (ms) can get trend boost. */
export const FEED_TREND_RECENCY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Min engagement ratio (likes+comments)/views to qualify for trend boost. */
export const FEED_TREND_MIN_ENGAGEMENT_RATIO = 0.03;

/** Multiplier for trend-boosted videos (1.0 = no boost). */
export const FEED_TREND_BOOST_MULTIPLIER = 1.25;

/** Default feed size. */
export const FEED_DEFAULT_LIMIT = 30;

/** Tier order for ordinal rank (0 = STARTER, 4 = GLOBAL). */
export const FEED_TIER_ORDER: Record<CreatorTier, number> = {
  STARTER: 0,
  RISING: 1,
  FEATURED: 2,
  SPOTLIGHT: 3,
  GLOBAL: 4,
};
