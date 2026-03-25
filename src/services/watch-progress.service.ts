/**
 * Watch progress tracking for For You retention scoring.
 * Records per-user watch time and completion % when user leaves a video.
 */

import { prisma } from '@/lib/prisma';

export interface RecordWatchProgressInput {
  userId: string;
  videoId: string;
  watchTimeSec: number;
  completedPct: number;
  durationSec: number;
}

/**
 * Record or update watch interaction. Upserts per user+video.
 * completedPct: 0–1 (e.g. 0.8 = 80% watched).
 * isRewatch: true if user had previously watched this video.
 * Also updates VideoWatchStats for completion-rate ranking.
 */
export async function recordWatchProgress(input: RecordWatchProgressInput): Promise<void> {
  const { userId, videoId, watchTimeSec, completedPct, durationSec } = input;
  const pct = Math.min(1, Math.max(0, completedPct));

  await prisma.$transaction(async (tx) => {
    await tx.userWatchInteraction.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: {
        userId,
        videoId,
        watchTimeSec,
        completedPct: pct,
        isRewatch: false,
      },
      update: {
        watchTimeSec,
        completedPct: pct,
        isRewatch: true,
      },
    });

    // Update VideoWatchStats for completion-rate ranking (prioritize videos users watch to end)
    const completed = pct >= 0.7 ? 1 : 0;
    await tx.videoWatchStats.upsert({
      where: { videoId },
      create: {
        videoId,
        totalWatchSeconds: watchTimeSec,
        completedViewsCount: completed,
        viewCount: 1,
      },
      update: {
        totalWatchSeconds: { increment: watchTimeSec },
        completedViewsCount: { increment: completed },
        viewCount: { increment: 1 },
      },
    });
  });
}

/** Videos watched in last N hours are excluded (no repeat in short time). */
export const RECENT_WATCH_EXCLUDE_HOURS = 24;

/**
 * Get watched video IDs for a user (for exclusion/down-ranking in feed).
 */
export async function getWatchedVideoIds(userId: string, limit = 500): Promise<Set<string>> {
  const rows = await prisma.userWatchInteraction.findMany({
    where: { userId },
    orderBy: { lastWatchedAt: 'desc' },
    take: limit,
    select: { videoId: true },
  });
  return new Set(rows.map((r) => r.videoId));
}

/**
 * Get video IDs watched in last N hours — exclude from feed (no repeat in short time).
 */
export async function getRecentlyWatchedVideoIds(
  userId: string,
  hours = RECENT_WATCH_EXCLUDE_HOURS
): Promise<Set<string>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.userWatchInteraction.findMany({
    where: { userId, lastWatchedAt: { gte: since } },
    select: { videoId: true },
  });
  return new Set(rows.map((r) => r.videoId));
}

/**
 * Get user's positive signals: videos with high completion (≥70%) for preference learning.
 */
export async function getPositiveWatchVideoIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userWatchInteraction.findMany({
    where: { userId, completedPct: { gte: 0.7 } },
    select: { videoId: true },
  });
  return new Set(rows.map((r) => r.videoId));
}

/**
 * Get user's negative signals: videos with fast skip (<20%) for down-ranking similar content.
 */
export async function getNegativeWatchVideoIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userWatchInteraction.findMany({
    where: { userId, completedPct: { lt: 0.2 } },
    select: { videoId: true },
  });
  return new Set(rows.map((r) => r.videoId));
}
