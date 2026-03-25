import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { getISOWeek } from '@/lib/date-utils';
import type {
  LeaderboardPeriod,
  LeaderboardCreatorRow,
  LeaderboardPerformanceRow,
} from '@/types/leaderboard';

/**
 * Support leaderboard: gift/coin counters only. Do not mix with likes or votes.
 *
 * Uses materialized counters (User.totalCoinsReceived/totalCoinsSpent, Video.coinsCount/giftsCount,
 * CreatorSupportWeekly, etc.) updated only in gift.service. No aggregation over GiftTransaction on read.
 */

const CREATOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  country: true,
} as const;

/**
 * Top supported creators – rank creators by total coins received.
 * All-time: User.totalCoinsReceived (updated in gift tx).
 * Weekly: CreatorSupportWeekly (materialized per week).
 */
export async function getTopSupportedCreators(
  period: LeaderboardPeriod,
  limit = 50,
  options?: { year?: number; week?: number; viewerUserId?: string | null }
): Promise<LeaderboardCreatorRow[]> {
  const capped = Math.min(limit, 100);
  const viewerUserId = options?.viewerUserId ?? null;

  if (period === 'weekly') {
    const { year, week } =
      options?.year != null && options?.week != null
        ? { year: options.year, week: options.week }
        : getISOWeek(new Date());
    const rows = await prisma.creatorSupportWeekly.findMany({
      where: {
        AND: [{ year, week }, { creator: userDiscoveryVisibilityWhere(viewerUserId) }],
      },
      orderBy: [{ totalCoinsReceived: 'desc' }, { giftsCount: 'desc' }],
      take: capped,
      include: {
        creator: { select: CREATOR_SELECT },
      },
    });
    return rows.map((row, i) => ({
      rank: i + 1,
      userId: row.creator.id,
      username: row.creator.username,
      displayName: row.creator.displayName,
      avatarUrl: row.creator.avatarUrl,
      country: row.creator.country,
      totalSupportCoins: row.totalCoinsReceived,
      giftsCount: row.giftsCount,
    }));
  }

  // All-time: users who have received at least 1 coin (avoid scanning all users)
  const users = await prisma.user.findMany({
    where: { AND: [{ totalCoinsReceived: { gt: 0 } }, userDiscoveryVisibilityWhere(viewerUserId)] },
    orderBy: [{ totalCoinsReceived: 'desc' }, { id: 'asc' }],
    take: capped,
    select: {
      ...CREATOR_SELECT,
      totalCoinsReceived: true,
      creatorEarningsSummary: {
        select: { totalGiftsReceivedCount: true },
      },
    },
  });
  return users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    country: u.country,
    totalSupportCoins: u.totalCoinsReceived,
    giftsCount: u.creatorEarningsSummary?.totalGiftsReceivedCount ?? 0,
  }));
}

/**
 * Top supporters – rank users by total coins sent (gifts).
 * All-time: User.totalCoinsSpent (updated in gift tx when sending gifts).
 * Weekly: not yet materialized; can be added via UserSupportSentWeekly or aggregate.
 */
export async function getTopSupporters(
  period: LeaderboardPeriod,
  limit = 50,
  options?: { year?: number; week?: number; viewerUserId?: string | null }
): Promise<LeaderboardCreatorRow[]> {
  const capped = Math.min(limit, 100);
  const viewerUserId = options?.viewerUserId ?? null;

  if (period === 'weekly') {
    // Weekly top supporters would require a materialized table (e.g. UserSupportSentWeekly)
    // updated in the same tx as GiftTransaction. For now return empty or fallback to all-time.
    return getTopSupporters('all_time', capped, options);
  }

  const users = await prisma.user.findMany({
    where: { AND: [{ totalCoinsSpent: { gt: 0 } }, userDiscoveryVisibilityWhere(viewerUserId)] },
    orderBy: [{ totalCoinsSpent: 'desc' }, { id: 'asc' }],
    take: capped,
    select: {
      ...CREATOR_SELECT,
      totalCoinsSpent: true,
    },
  });

  // Gifts count for supporters: sum from CreatorSupporterSummary would be expensive.
  // For UI we can show totalCoinsSpent only, or add User.totalGiftsSent later.
  return users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    country: u.country,
    totalSupportCoins: u.totalCoinsSpent,
    giftsCount: 0, // Optional: add User.totalGiftsSent if needed for display
  }));
}

/**
 * Most gifted performances – rank videos by total coins received.
 * All-time: Video.coinsCount (materialized in gift tx).
 * Weekly: would require VideoSupportWeekly; for now all-time only.
 */
export async function getMostGiftedPerformances(
  period: LeaderboardPeriod,
  limit = 50,
  options?: { year?: number; week?: number; viewerUserId?: string | null }
): Promise<LeaderboardPerformanceRow[]> {
  const capped = Math.min(limit, 100);
  const viewerUserId = options?.viewerUserId ?? null;

  if (period === 'weekly') {
    // Weekly would need a materialized table (e.g. VideoSupportWeekly) or aggregate.
    // For now return all-time.
  }

  const videos = await prisma.video.findMany({
    where: {
      AND: [CANONICAL_PUBLIC_VIDEO_WHERE, videoDiscoveryVisibilityWhere(viewerUserId), { coinsCount: { gt: 0 } }],
    },
    orderBy: [{ coinsCount: 'desc' }, { giftsCount: 'desc' }, { id: 'asc' }],
    take: capped,
    select: {
      id: true,
      title: true,
      coinsCount: true,
      giftsCount: true,
      creatorId: true,
      creator: { select: CREATOR_SELECT },
    },
  });

  return videos.map((v, i) => ({
    rank: i + 1,
    videoId: v.id,
    videoTitle: v.title,
    creatorId: v.creator.id,
    creatorUsername: v.creator.username,
    creatorDisplayName: v.creator.displayName,
    creatorAvatarUrl: v.creator.avatarUrl,
    creatorCountry: v.creator.country,
    totalSupportCoins: v.coinsCount,
    giftsCount: v.giftsCount,
  }));
}
