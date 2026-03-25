/**
 * BETALENT talent ranking system – level definitions and thresholds.
 * Progression is algorithmic only (no manual promotion).
 * See: services/talent-ranking.service.ts
 */

import type { CreatorTier } from '@prisma/client';

export const TALENT_TIERS: CreatorTier[] = [
  'STARTER',
  'RISING',
  'FEATURED',
  'SPOTLIGHT',
  'GLOBAL',
];

/** Display label and badge text per tier */
export const TALENT_TIER_LABELS: Record<CreatorTier, string> = {
  STARTER: 'Starter Talent',
  RISING: 'Rising Talent',
  FEATURED: 'Featured Talent',
  SPOTLIGHT: 'Spotlight Talent',
  GLOBAL: 'Global Talent',
};

import { VIDEO_LIMITS } from './video-limits';

/** Upload limit (seconds) per tier. Standard cap is 90s; live-capable tiers may use 150s. */
export const TALENT_UPLOAD_LIMIT_SEC: Record<CreatorTier, number> = {
  STARTER: VIDEO_LIMITS.STANDARD,
  RISING: VIDEO_LIMITS.STANDARD,
  FEATURED: VIDEO_LIMITS.STANDARD,
  SPOTLIGHT: VIDEO_LIMITS.LIVE,
  GLOBAL: VIDEO_LIMITS.LIVE,
};

/** Minimum requirements to reach the next tier from the current one */
export interface TierRequirements {
  minPerformances?: number;
  minTotalViews?: number;
  minTotalVotes?: number;
  minFollowers?: number;
  minCompletionRatePercent?: number;
  minViralPerformances?: number;
  minEngagementRatio?: number; // e.g. (likes + comments) / views
  /** For GLOBAL: min views and international/community bar */
  minViewsForGlobal?: number;
}

/** Requirements to move FROM key tier TO the next */
export const TIER_REQUIREMENTS: Partial<Record<CreatorTier, TierRequirements>> = {
  // Starter → Rising
  STARTER: {
    minPerformances: 5,
    minTotalViews: 500,
    minTotalVotes: 100,
    minCompletionRatePercent: 40,
  },

  // Rising → Featured
  RISING: {
    minPerformances: 20,
    minTotalViews: 10_000,
    minTotalVotes: 2_000,
    minFollowers: 500,
    minCompletionRatePercent: 50,
  },

  // Featured → Spotlight
  FEATURED: {
    minPerformances: 10, // already have 20+ from Rising
    minTotalViews: 100_000,
    minTotalVotes: 20_000,
    minViralPerformances: 3,
    minEngagementRatio: 0.05, // 5% (likes+comments)/views
  },

  // Spotlight → Global (reserved for top performers)
  SPOTLIGHT: {
    minTotalViews: 1_000_000,
    minTotalVotes: 100_000,
    minViralPerformances: 10,
    minEngagementRatio: 0.04,
    minViewsForGlobal: 1_000_000,
  },
};

/** A performance is "viral" if it meets this bar (used for viral count) */
export const VIRAL_PERFORMANCE_VIEWS = 10_000;
export const VIRAL_PERFORMANCE_VOTES = 2_000;

/** Default completion rate when no watch-time data exists (e.g. 50% assumed) */
export const DEFAULT_COMPLETION_RATE_WHEN_UNKNOWN = 0.5;
