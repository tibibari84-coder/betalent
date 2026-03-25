import { prisma } from '@/lib/prisma';

/**
 * Creator-level top supporters: who sent the most support (coins) to this creator across all videos.
 * Data from CreatorSupporterSummary; ranking by totalCoinsSent. Display-ready for profile UI.
 */

export type CreatorTopSupporter = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** For future country flag in UI */
  country: string | null;
  totalCoinsSent: number;
  giftsCount: number;
};

/**
 * Returns top supporters of a creator, ordered by total coins sent (desc).
 * Uses CreatorSupporterSummary only; no aggregation over GiftTransaction.
 */
export async function getCreatorTopSupporters(
  creatorId: string,
  limit = 20
): Promise<CreatorTopSupporter[]> {
  const rows = await prisma.creatorSupporterSummary.findMany({
    where: { creatorId },
    orderBy: { totalCoinsSent: 'desc' },
    take: Math.min(limit, 100),
    include: {
      supporter: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
        },
      },
    },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.supporter.id,
    username: row.supporter.username,
    displayName: row.supporter.displayName,
    avatarUrl: row.supporter.avatarUrl,
    country: row.supporter.country ?? null,
    totalCoinsSent: row.totalCoinsSent,
    giftsCount: row.giftsCount,
  }));
}
