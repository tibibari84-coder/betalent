/**
 * Watch stat recording for For You retention.
 * Updates VideoWatchStats (aggregated) and UserWatchInteraction (per-user when logged in).
 */

import { prisma } from '@/lib/prisma';

export interface RecordWatchStatInput {
  videoId: string;
  userId: string | null;
  watchedSeconds: number;
  watchedPercent: number;
  completed: boolean;
  skippedQuickly: boolean;
  replayed: boolean;
  isFinal?: boolean;
}

/**
 * Record watch event. Updates aggregated VideoWatchStats and per-user UserWatchInteraction.
 */
export async function recordWatchStat(input: RecordWatchStatInput): Promise<void> {
  const { videoId, userId, watchedSeconds, watchedPercent, completed, skippedQuickly, replayed, isFinal = true } = input;
  const pct = Math.min(1, Math.max(0, watchedPercent));

  if (!isFinal && !userId) return;

  await prisma.$transaction(async (tx) => {
    if (isFinal) {
      const completedDelta = completed ? 1 : 0;
      const skipDelta = skippedQuickly ? 1 : 0;
      const replayDelta = replayed ? 1 : 0;

      await tx.videoWatchStats.upsert({
        where: { videoId },
        create: {
          videoId,
          totalWatchSeconds: watchedSeconds,
          completedViewsCount: completedDelta,
          viewCount: 1,
          skipCount: skipDelta,
          replayCount: replayDelta,
        },
        update: {
          totalWatchSeconds: { increment: watchedSeconds },
          completedViewsCount: { increment: completedDelta },
          viewCount: { increment: 1 },
          skipCount: { increment: skipDelta },
          replayCount: { increment: replayDelta },
        },
      });
    }

    if (userId) {
      await tx.userWatchInteraction.upsert({
        where: { userId_videoId: { userId, videoId } },
        create: {
          userId,
          videoId,
          watchTimeSec: watchedSeconds,
          completedPct: pct,
          isRewatch: replayed,
        },
        update: {
          watchTimeSec: watchedSeconds,
          completedPct: pct,
          isRewatch: replayed,
        },
      });
    }
  });
}
