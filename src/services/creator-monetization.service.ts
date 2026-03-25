import { prisma } from '@/lib/prisma';
import { getISOWeek } from '@/lib/date-utils';

/**
 * Creator monetization summary: gifts + super vote support.
 * Reads from User.totalCoinsReceived, CreatorEarningsSummary, CreatorSupportWeekly,
 * and VideoSupportStats (super vote coins per creator's videos).
 */

export type CreatorMonetizationSummary = {
  totalGiftsReceived: number;
  totalCoinSupportReceived: number;
  /** Coins received from super votes (sum of VideoSupportStats for creator's videos). */
  totalSuperVoteCoinsReceived: number;
  /** totalCoinSupportReceived + totalSuperVoteCoinsReceived */
  totalSupportCoins: number;
  totalEarningsCredited: number;
  weeklySupportAmount: number;
  allTimeSupportAmount: number;
  /** Current ISO year/week for weeklySupportAmount */
  year: number;
  week: number;
};

const ZERO_SUMMARY: CreatorMonetizationSummary = {
  totalGiftsReceived: 0,
  totalCoinSupportReceived: 0,
  totalSuperVoteCoinsReceived: 0,
  totalSupportCoins: 0,
  totalEarningsCredited: 0,
  weeklySupportAmount: 0,
  allTimeSupportAmount: 0,
  year: 0,
  week: 0,
};

/**
 * Returns monetization counters for a creator. All values derived from
 * User, CreatorEarningsSummary, and CreatorSupportWeekly (no aggregation over GiftTransaction).
 */
export async function getCreatorMonetizationSummary(
  creatorId: string
): Promise<CreatorMonetizationSummary> {
  const now = new Date();
  const { year, week } = getISOWeek(now);

  const [user, earnings, weekly, superVoteAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: creatorId },
      select: { totalCoinsReceived: true },
    }),
    prisma.creatorEarningsSummary.findUnique({
      where: { creatorId },
      select: {
        totalGiftsReceivedCount: true,
        totalEarningsCoins: true,
      },
    }),
    prisma.creatorSupportWeekly.findUnique({
      where: {
        creatorId_year_week: { creatorId, year, week },
      },
      select: { totalCoinsReceived: true },
    }),
    prisma.videoSupportStats.aggregate({
      where: { video: { creatorId } },
      _sum: { totalCoinsEarned: true },
    }),
  ]);

  if (!user) return { ...ZERO_SUMMARY, year, week };

  const totalCoinSupportReceived = user.totalCoinsReceived;
  const totalSuperVoteCoinsReceived = superVoteAgg?._sum?.totalCoinsEarned ?? 0;
  const totalGiftsReceived = earnings?.totalGiftsReceivedCount ?? 0;
  const totalEarningsCredited = earnings?.totalEarningsCoins ?? 0;
  const weeklySupportAmount = weekly?.totalCoinsReceived ?? 0;

  return {
    totalGiftsReceived,
    totalCoinSupportReceived,
    totalSuperVoteCoinsReceived,
    totalSupportCoins: totalCoinSupportReceived + totalSuperVoteCoinsReceived,
    totalEarningsCredited,
    weeklySupportAmount,
    allTimeSupportAmount: totalCoinSupportReceived,
    year,
    week,
  };
}

/**
 * Returns top creators by support for a given ISO week (for weekly leaderboard).
 * Scalable: reads from CreatorSupportWeekly only.
 */
export async function getWeeklySupportLeaderboard(
  year: number,
  week: number,
  limit = 50
): Promise<
  Array<{
    creatorId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    totalCoinsReceived: number;
    giftsCount: number;
    rank: number;
  }>
> {
  const rows = await prisma.creatorSupportWeekly.findMany({
    where: { year, week },
    orderBy: { totalCoinsReceived: 'desc' },
    take: limit,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return rows.map((row, index) => ({
    creatorId: row.creator.id,
    username: row.creator.username,
    displayName: row.creator.displayName,
    avatarUrl: row.creator.avatarUrl,
    totalCoinsReceived: row.totalCoinsReceived,
    giftsCount: row.giftsCount,
    rank: index + 1,
  }));
}
