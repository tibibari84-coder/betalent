/**
 * BETALENT support leaderboard types.
 * Future-ready for UI: creator name, flag (country), avatar, total support, rank.
 */

export const LEADERBOARD_TYPES = {
  TOP_SUPPORTED_CREATORS: 'top_supported_creators',
  TOP_SUPPORTERS: 'top_supporters',
  MOST_GIFTED_PERFORMANCES: 'most_gifted_performances',
} as const;

export type LeaderboardType = (typeof LEADERBOARD_TYPES)[keyof typeof LEADERBOARD_TYPES];

export const LEADERBOARD_PERIODS = {
  ALL_TIME: 'all_time',
  WEEKLY: 'weekly',
} as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[keyof typeof LEADERBOARD_PERIODS];

/** UI-ready row for creator-focused leaderboards (top supported creators, top supporters). */
export type LeaderboardCreatorRow = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  totalSupportCoins: number;
  giftsCount: number;
};

/** UI-ready row for performance-focused leaderboard (most gifted performances). */
export type LeaderboardPerformanceRow = {
  rank: number;
  videoId: string;
  videoTitle: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  creatorCountry: string | null;
  totalSupportCoins: number;
  giftsCount: number;
};
