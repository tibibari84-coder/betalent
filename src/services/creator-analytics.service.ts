/**
 * Creator Analytics – aggregates per-video and creator summary.
 * Uses existing Video, VideoWatchStats, User. No heavy live queries.
 */

import { prisma } from '@/lib/prisma';

export type PerVideoAnalytics = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  createdAt: Date;
  views: number;
  completionRate: number;
  avgWatchTimeSec: number;
  likes: number;
  comments: number;
  gifts: number;
  coins: number;
  retentionScore: number;
};

export type CreatorSummary = {
  totalViews: number;
  totalCoinsEarned: number;
  totalVideos: number;
  totalLikes: number;
  totalComments: number;
  totalGifts: number;
};

export type PeriodTrend = {
  period: '7d' | '30d';
  newVideosCount: number;
  newVideosViews: number;
  newVideosLikes: number;
  newVideosCoins: number;
};

export type CreatorAnalytics = {
  summary: CreatorSummary;
  perVideo: PerVideoAnalytics[];
  topPerforming: PerVideoAnalytics[];
  trend7d: PeriodTrend;
  trend30d: PeriodTrend;
};

function safePct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.min(100, Math.round((num / denom) * 100));
}

function retentionScore(completed: number, viewCount: number, skipCount: number): number {
  if (viewCount <= 0) return 0;
  const completion = completed / viewCount;
  const skipPenalty = skipCount / viewCount;
  return Math.max(0, Math.min(100, Math.round((completion - skipPenalty * 0.5) * 100)));
}

export async function getCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
  const now = new Date();
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [user, videos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        totalViews: true,
        totalCoinsReceived: true,
        totalLikes: true,
        totalComments: true,
      },
    }),
    prisma.video.findMany({
      where: { creatorId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        durationSec: true,
        createdAt: true,
        viewsCount: true,
        likesCount: true,
        commentsCount: true,
        giftsCount: true,
        coinsCount: true,
        watchStats: {
          select: {
            totalWatchSeconds: true,
            completedViewsCount: true,
            viewCount: true,
            skipCount: true,
          },
        },
      },
    }),
  ]);

  const perVideo: PerVideoAnalytics[] = videos.map((v) => {
    const ws = v.watchStats;
    const viewCount = ws?.viewCount ?? 0;
    const completed = ws?.completedViewsCount ?? 0;
    const totalSec = ws?.totalWatchSeconds ?? 0;
    const skipCount = ws?.skipCount ?? 0;
    const views = v.viewsCount;

    const completionRate = viewCount > 0 ? safePct(completed, viewCount) : 0;
    const avgWatchTimeSec = viewCount > 0 ? Math.round(totalSec / viewCount) : 0;
    const retScore = retentionScore(completed, viewCount, skipCount);

    return {
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      createdAt: v.createdAt,
      views,
      completionRate,
      avgWatchTimeSec,
      likes: v.likesCount,
      comments: v.commentsCount,
      gifts: v.giftsCount,
      coins: v.coinsCount,
      retentionScore: retScore,
    };
  });

  const topPerforming = [...perVideo]
    .sort((a, b) => {
      const scoreA = a.views * 1 + a.likes * 3 + a.comments * 4 + a.coins * 5;
      const scoreB = b.views * 1 + b.likes * 3 + b.comments * 4 + b.coins * 5;
      return scoreB - scoreA;
    })
    .slice(0, 10);

  const videos7d = perVideo.filter((v) => v.createdAt >= cutoff7d);
  const videos30d = perVideo.filter((v) => v.createdAt >= cutoff30d);

  const trend7d: PeriodTrend = {
    period: '7d',
    newVideosCount: videos7d.length,
    newVideosViews: videos7d.reduce((s, v) => s + v.views, 0),
    newVideosLikes: videos7d.reduce((s, v) => s + v.likes, 0),
    newVideosCoins: videos7d.reduce((s, v) => s + v.coins, 0),
  };

  const trend30d: PeriodTrend = {
    period: '30d',
    newVideosCount: videos30d.length,
    newVideosViews: videos30d.reduce((s, v) => s + v.views, 0),
    newVideosLikes: videos30d.reduce((s, v) => s + v.likes, 0),
    newVideosCoins: videos30d.reduce((s, v) => s + v.coins, 0),
  };

  const summary: CreatorSummary = {
    totalViews: user?.totalViews ?? perVideo.reduce((s, v) => s + v.views, 0),
    totalCoinsEarned: user?.totalCoinsReceived ?? perVideo.reduce((s, v) => s + v.coins, 0),
    totalVideos: perVideo.length,
    totalLikes: user?.totalLikes ?? perVideo.reduce((s, v) => s + v.likes, 0),
    totalComments: user?.totalComments ?? perVideo.reduce((s, v) => s + v.comments, 0),
    totalGifts: perVideo.reduce((s, v) => s + v.gifts, 0),
  };

  return {
    summary,
    perVideo,
    topPerforming,
    trend7d,
    trend30d,
  };
}
