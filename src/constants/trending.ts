/**
 * BETALENT trending detection – trend score weights and windows.
 * Trending highlights: rapid engagement growth, high watch completion, rapid gift support, rapid super vote activity.
 * Use short windows (3h, 6h) for frequently updating "Rising now" surfaces.
 */

/** Legacy trend weights (used by trending.service if needed). Prefer TREND_WEIGHTS_VELOCITY in ranking.service. */
export const TREND_WEIGHTS = {
  votesPerHour: 3,
  likesPerHour: 2,
  sharesPerHour: 3,
  commentsPerHour: 2,
  watchCompletionRate: 5,
} as const;

/** Supported trend windows (hours). Short windows = more frequent updates. */
export const TREND_WINDOW_HOURS = {
  '3h': 3,
  '6h': 6,
  '12h': 12,
  '24h': 24,
} as const;

export type TrendWindowKey = keyof typeof TREND_WINDOW_HOURS;

/** Default window for "Trending Today" (24h). Use 3h/6h for "Rising now". */
export const TREND_DEFAULT_WINDOW: TrendWindowKey = '24h';

/** Default number of videos to return per trending list. */
export const TREND_DEFAULT_LIMIT = 30;

/** Max limit per request. */
export const TREND_MAX_LIMIT = 50;

/** When watch completion is unknown, use this value (0–1). */
export const TREND_DEFAULT_WATCH_COMPLETION = 0.5;

/** Min engagement in window to be eligible for trending (avoids 1-like noise). */
export const TREND_MIN_ENGAGEMENT_IN_WINDOW = 1;
