/**
 * BETALENT Trending system – single entry point for trending logic.
 *
 * Highlights performances with:
 * - Rapid engagement growth: likes and comments in window (per-hour velocity)
 * - High watch completion: real completion from VideoWatchStats when available, else engagement proxy
 * - Rapid gift support: gift transactions in window (coin amount per hour)
 * - Rapid super vote activity: RECEIVED_VOTES in window (per hour)
 *
 * Trending updates frequently: score is computed per-request from current data (no server-side score cache).
 * Use short windows (3h, 6h) for "Rising now"; 24h for "Trending today".
 */

import { getTrendingRanked } from '@/services/ranking.service';
import { TREND_WINDOW_HOURS, TREND_DEFAULT_LIMIT } from '@/constants/trending';
import type { TrendWindowKey } from '@/constants/trending';

export type { TrendWindowKey };

export interface GetTrendingInput {
  /** 3h / 6h = Rising now, 24h = Trending today. */
  window?: TrendWindowKey;
  limit?: number;
}

export interface GetTrendingResult {
  videoIds: string[];
  window: TrendWindowKey;
  windowHours: number;
}

/**
 * Get trending video IDs. Delegates to ranking.service (velocity-based score:
 * super votes, gift support, engagement, watch completion in the time window).
 */
export async function getTrendingVideos(
  input: GetTrendingInput = {}
): Promise<GetTrendingResult> {
  const windowKey = input.window ?? '24h';
  const windowHours = TREND_WINDOW_HOURS[windowKey];
  const limit = Math.min(input.limit ?? TREND_DEFAULT_LIMIT, 50);
  const { videoIds } = await getTrendingRanked({ windowHours, limit });
  return { videoIds, window: windowKey, windowHours };
}
