/**
 * Early distribution: new uploads get initial exposure, then boost or suppress based on retention.
 * Enables breakout viral content from unknown creators.
 *
 * Flow:
 * 1. New uploads get initial exposure (50–200 users) via exploration slots.
 * 2. Measure: completionRate, skipRate, replay from VideoWatchStats.
 * 3. If strong (high completion, low skip) → boost to larger audience.
 * 4. If weak (low completion, high skip) → suppress quickly.
 */

import { EARLY_DISTRIBUTION } from '@/constants/ranking';

export type EarlyDistributionPhase =
  | 'seeding'      // viewCount < minSamples: ensure initial exposure
  | 'testing'      // minSamples <= viewCount < maxSamples: measuring
  | 'boosted'      // strong retention → larger audience
  | 'suppressed'   // weak retention → suppress
  | 'graduated';   // viewCount >= maxSamples or age > testPhase: normal ranking

export interface EarlyDistributionStatus {
  phase: EarlyDistributionPhase;
  multiplier: number;
  viewCount: number;
  completionRate: number;
  skipRate: number;
  replayRate: number;
  ageHours: number;
}

function safeRatio(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(1, num / denom);
}

/**
 * Compute early distribution status and score multiplier for a video.
 * Uses VideoWatchStats (completionRate, skipRate, replay) and age.
 */
export function getEarlyDistributionStatus(params: {
  watchStats: {
    viewCount: number;
    completedViewsCount: number;
    skipCount: number;
    replayCount: number;
  } | null;
  ageHours: number;
}): EarlyDistributionStatus {
  const cfg = EARLY_DISTRIBUTION;
  const ws = params.watchStats;
  const ageHours = params.ageHours;

  const viewCount = ws?.viewCount ?? 0;
  const completionRate =
    viewCount > 0 ? safeRatio(ws!.completedViewsCount, viewCount) : 0;
  const skipRate = viewCount > 0 ? safeRatio(ws!.skipCount, viewCount) : 0;
  const replayRate = viewCount > 0 ? safeRatio(ws!.replayCount, viewCount) : 0;

  const inTestPhase = ageHours <= cfg.testPhaseHours;

  if (!inTestPhase || viewCount >= cfg.maxSamples) {
    return {
      phase: 'graduated',
      multiplier: 1,
      viewCount,
      completionRate,
      skipRate,
      replayRate,
      ageHours,
    };
  }

  if (viewCount < cfg.minSamples) {
    return {
      phase: 'seeding',
      multiplier: cfg.seedingBoost,
      viewCount,
      completionRate,
      skipRate,
      replayRate,
      ageHours,
    };
  }

  const strong = completionRate >= cfg.boostCompletionMin && skipRate <= cfg.boostSkipMax;
  const weak = completionRate < cfg.suppressCompletionMax || skipRate >= cfg.suppressSkipMin;

  if (strong) {
    return {
      phase: 'boosted',
      multiplier: cfg.boostMultiplier,
      viewCount,
      completionRate,
      skipRate,
      replayRate,
      ageHours,
    };
  }

  if (weak) {
    return {
      phase: 'suppressed',
      multiplier: cfg.suppressMultiplier,
      viewCount,
      completionRate,
      skipRate,
      replayRate,
      ageHours,
    };
  }

  return {
    phase: 'testing',
    multiplier: 1,
    viewCount,
    completionRate,
    skipRate,
    replayRate,
    ageHours,
  };
}
