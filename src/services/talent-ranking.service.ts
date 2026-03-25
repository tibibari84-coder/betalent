/**
 * BETALENT talent ranking system.
 * Determines creator tier from engagement, votes, consistency, and growth.
 * Run daily (e.g. cron) to update user.creatorTier, user.rankProgress, user.uploadLimitSec, user.totalVotes.
 */

import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import type { CreatorTier } from '@prisma/client';
import {
  TALENT_TIERS,
  TALENT_TIER_LABELS,
  TALENT_UPLOAD_LIMIT_SEC,
  TIER_REQUIREMENTS,
  VIRAL_PERFORMANCE_VIEWS,
  VIRAL_PERFORMANCE_VOTES,
  DEFAULT_COMPLETION_RATE_WHEN_UNKNOWN,
} from '@/constants/talent-ranking';
import { updateAllRankingStats } from '@/services/ranking.service';

export interface CreatorSignals {
  userId: string;
  performancesCount: number;
  totalViews: number;
  totalVotes: number;
  totalLikes: number;
  totalComments: number;
  followersCount: number;
  viralPerformancesCount: number;
  /** 0–1; when no watch-time data, use default */
  completionRate: number;
}

export interface RankResult {
  tier: CreatorTier;
  progress: number;
  uploadLimitSec: number;
  totalVotes: number;
}

/**
 * Aggregate per-creator video stats (votes = sum of score, viral count).
 */
async function getCreatorVideoAggregates(): Promise<
  Map<string, { totalVotes: number; viralCount: number }>
> {
  const videos = await prisma.video.findMany({
    where: CANONICAL_PUBLIC_VIDEO_WHERE,
    select: { creatorId: true, viewsCount: true, score: true },
  });
  const map = new Map<string, { totalVotes: number; viralCount: number }>();
  for (const v of videos) {
    const cur = map.get(v.creatorId) ?? { totalVotes: 0, viralCount: 0 };
    cur.totalVotes += v.score;
    if (
      v.viewsCount >= VIRAL_PERFORMANCE_VIEWS ||
      v.score >= VIRAL_PERFORMANCE_VOTES
    ) {
      cur.viralCount += 1;
    }
    map.set(v.creatorId, cur);
  }
  return map;
}

/**
 * Compute tier and progress for one creator from their signals.
 */
export function computeRank(signals: CreatorSignals): RankResult {
  const {
    totalViews,
    totalVotes,
    performancesCount: performances,
    followersCount: followers,
    viralPerformancesCount: viralCount,
    totalLikes,
    totalComments,
    completionRate,
  } = signals;

  const engagementRatio =
    totalViews > 0 ? (totalLikes + totalComments) / totalViews : 0;

  let tier: CreatorTier = 'STARTER';
  const tierOrder = TALENT_TIERS as readonly CreatorTier[];

  // Determine highest tier the creator qualifies for
  for (let i = 0; i < tierOrder.length - 1; i++) {
    const current = tierOrder[i];
    const next = tierOrder[i + 1];
    const req = TIER_REQUIREMENTS[current];
    if (!req) continue;

    const meetsPerformances = req.minPerformances == null || performances >= req.minPerformances;
    const meetsViews = req.minTotalViews == null || totalViews >= req.minTotalViews;
    const meetsVotes = req.minTotalVotes == null || totalVotes >= req.minTotalVotes;
    const meetsFollowers = req.minFollowers == null || followers >= req.minFollowers;
    const meetsCompletion =
      req.minCompletionRatePercent == null ||
      completionRate >= req.minCompletionRatePercent / 100;
    const meetsViral =
      req.minViralPerformances == null || viralCount >= req.minViralPerformances;
    const meetsEngagement =
      req.minEngagementRatio == null || engagementRatio >= req.minEngagementRatio;
    const meetsGlobalViews =
      req.minViewsForGlobal == null || totalViews >= req.minViewsForGlobal;

    if (
      meetsPerformances &&
      meetsViews &&
      meetsVotes &&
      meetsFollowers &&
      meetsCompletion &&
      meetsViral &&
      meetsEngagement &&
      meetsGlobalViews
    ) {
      tier = next;
    } else {
      break;
    }
  }

  // Progress 0–1 toward next tier
  const nextTierIndex = tierOrder.indexOf(tier) + 1;
  let progress = 1;
  if (nextTierIndex < tierOrder.length) {
    const nextTier = tierOrder[nextTierIndex];
    const req = TIER_REQUIREMENTS[tier];
    if (req) {
      const viewProgress =
        req.minTotalViews != null && req.minTotalViews > 0
          ? Math.min(1, totalViews / req.minTotalViews)
          : 1;
      const voteProgress =
        req.minTotalVotes != null && req.minTotalVotes > 0
          ? Math.min(1, totalVotes / req.minTotalVotes)
          : 1;
      const perfProgress =
        req.minPerformances != null && req.minPerformances > 0
          ? Math.min(1, performances / req.minPerformances)
          : 1;
      const followerProgress =
        req.minFollowers != null && req.minFollowers > 0
          ? Math.min(1, followers / req.minFollowers)
          : 1;
      const viralProgress =
        req.minViralPerformances != null && req.minViralPerformances > 0
          ? Math.min(1, viralCount / req.minViralPerformances)
          : 1;
      // Weighted average; votes and views matter most
      progress =
        viewProgress * 0.3 +
        voteProgress * 0.3 +
        perfProgress * 0.15 +
        followerProgress * 0.15 +
        viralProgress * 0.1;
      progress = Math.min(1, Math.round(progress * 100) / 100);
    }
  }

  return {
    tier,
    progress,
    uploadLimitSec: TALENT_UPLOAD_LIMIT_SEC[tier],
    totalVotes,
  };
}

/**
 * Run the full ranking job: recompute tier and progress for all users with videos,
 * update user.creatorTier, rankProgress, rankUpdatedAt, uploadLimitSec, totalVotes,
 * then update VideoRankingStats for all READY videos (for fast feed/trending generation).
 */
export async function runTalentRankingJob(): Promise<{
  updated: number;
  errors: string[];
  rankingStatsUpdated?: number;
}> {
  const now = new Date();
  const videoAggregates = await getCreatorVideoAggregates();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      videosCount: true,
      totalViews: true,
      totalLikes: true,
      totalComments: true,
      followersCount: true,
    },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const user of users) {
    const agg = videoAggregates.get(user.id) ?? {
      totalVotes: 0,
      viralCount: 0,
    };

    const signals: CreatorSignals = {
      userId: user.id,
      performancesCount: user.videosCount,
      totalViews: user.totalViews,
      totalVotes: agg.totalVotes,
      totalLikes: user.totalLikes,
      totalComments: user.totalComments,
      followersCount: user.followersCount,
      viralPerformancesCount: agg.viralCount,
      completionRate: DEFAULT_COMPLETION_RATE_WHEN_UNKNOWN,
    };

    const result = computeRank(signals);

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          creatorTier: result.tier,
          rankProgress: result.progress,
          rankUpdatedAt: now,
          uploadLimitSec: result.uploadLimitSec,
          totalVotes: result.totalVotes,
        },
      });
      updated += 1;
    } catch (e) {
      errors.push(`${user.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let rankingStatsUpdated = 0;
  try {
    const result = await updateAllRankingStats(100);
    rankingStatsUpdated = result.updated;
  } catch (e) {
    errors.push(`VideoRankingStats: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { updated, errors, rankingStatsUpdated };
}

/**
 * Get rank badge label for a tier (for profile/UI).
 */
export function getRankBadgeLabel(tier: CreatorTier): string {
  return TALENT_TIER_LABELS[tier] ?? tier;
}
