/**
 * BETALENT creator leaderboard – score weights and leaderboard types.
 * See: docs/CREATOR-LEADERBOARD-DESIGN.md
 */

/** Creator score = (total_votes * W_VOTES) + (total_likes * W_LIKES) + ... */
export const CREATOR_SCORE_WEIGHTS = {
  totalVotes: 3,
  totalLikes: 2,
  totalShares: 3,
  followers: 2,
  videoCompletionRate: 5,
} as const;

export type CreatorLeaderboardType = 'daily' | 'weekly' | 'monthly' | 'alltime';

/** Window in hours for daily, weekly, monthly. */
export const CREATOR_LEADERBOARD_WINDOW_HOURS: Record<
  Exclude<CreatorLeaderboardType, 'alltime'>,
  number
> = {
  daily: 24,
  weekly: 7 * 24,
  monthly: 30 * 24,
};

/** Default leaderboard type. */
export const CREATOR_LEADERBOARD_DEFAULT_TYPE: CreatorLeaderboardType = 'weekly';

/** Default number of creators to return. */
export const CREATOR_LEADERBOARD_DEFAULT_LIMIT = 50;

/** Max limit per request. */
export const CREATOR_LEADERBOARD_MAX_LIMIT = 100;

/** When completion rate is unknown (e.g. no views), use this (0–1). */
export const CREATOR_DEFAULT_COMPLETION_RATE = 0.5;

/**
 * Category slugs used for leaderboard filters.
 * Maps UI buckets (Music, Dance, Comedy, etc.) to category slugs in DB.
 * Use category slug from Category table for per-category leaderboards.
 */
export const CREATOR_LEADERBOARD_CATEGORY_SLUGS = [
  'singing',
  'instrument',
  'rap',
  'dance',
  'performance',
  'gospel',
  'beatbox',
  'special-talent',
  'radio-jingle',
] as const;
