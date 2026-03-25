/**
 * BETALENT Global Leaderboard – types, periods, and scoring weights.
 * Supports: global/country × creator/performance × daily/weekly/monthly/all_time.
 */

export const LEADERBOARD_PERIODS = ['daily', 'weekly', 'monthly', 'all_time'] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_MODES = [
  'global_creator',
  'global_performance',
  'country_creator',
  'country_performance',
] as const;
export type LeaderboardMode = (typeof LEADERBOARD_MODES)[number];

/** Scope: global rankings vs country-specific. */
export const LEADERBOARD_SCOPES = ['global', 'country'] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];

/** Target: rank creators vs rank performances (videos). */
export const LEADERBOARD_TARGETS = ['creator', 'performance'] as const;
export type LeaderboardTarget = (typeof LEADERBOARD_TARGETS)[number];

/** Window in hours for time-bound periods. */
export const LEADERBOARD_PERIOD_HOURS: Record<Exclude<LeaderboardPeriod, 'all_time'>, number> = {
  daily: 24,
  weekly: 7 * 24,
  monthly: 30 * 24,
};

export const DEFAULT_LEADERBOARD_PERIOD: LeaderboardPeriod = 'weekly';
export const DEFAULT_LEADERBOARD_MODE: LeaderboardMode = 'global_creator';
export const LEADERBOARD_PAGE_SIZE = 50;
export const LEADERBOARD_MAX_PAGE_SIZE = 100;

/**
 * Performance (video) leaderboard – weighted score formula.
 * leaderboardScore = talentScoreWeight + voteWeight + supportWeight + engagementWeight + watchQualityWeight
 * Structure is adjustable; change weights here to tune ranking.
 */
export const PERFORMANCE_SCORE_WEIGHTS = {
  /** Talent score 0–10 from votes; high impact. */
  talentScore: 12,
  /** Raw vote count (1–10 votes). */
  votesCount: 3,
  /** Super votes / coins (support). */
  supportCoins: 2,
  /** Views. */
  viewsCount: 0.8,
  /** Likes. */
  likesCount: 1.5,
  /** Comments. */
  commentsCount: 1.2,
  /** Shares. */
  sharesCount: 2,
  /** Optional: watch quality proxy (e.g. completion); use 0 if not available. */
  watchQuality: 1,
} as const;
