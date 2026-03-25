import { prisma } from '@/lib/prisma';

/**
 * Video-level gift counters: derived from materialized tables updated in same tx as GiftTransaction.
 * No recalculation on read; counters stay consistent with transaction history.
 */

export type GiftCountByType = {
  giftId: string;
  giftSlug: string;
  giftName: string;
  coinCost: number;
  count: number;
};

export type TopSupporter = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** For future country flag in UI */
  country: string | null;
  totalCoinsSent: number;
  giftsCount: number;
};

export type VideoGiftSummary = {
  totalCoinsReceived: number;
  totalGiftsReceived: number;
  giftCountByType: GiftCountByType[];
  topSupporters: TopSupporter[];
};

/**
 * Returns the full gift summary for a video (counts by type + top supporters).
 * Uses materialized VideoGiftTypeSummary and VideoSupporterSummary; no aggregation over GiftTransaction.
 */
export async function getVideoGiftSummary(videoId: string): Promise<VideoGiftSummary | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, coinsCount: true, giftsCount: true },
  });
  if (!video) return null;

  const [byType, supporters] = await Promise.all([
    prisma.videoGiftTypeSummary.findMany({
      where: { videoId },
      include: {
        gift: { select: { id: true, slug: true, name: true, coinCost: true } },
      },
      orderBy: { count: 'desc' },
    }),
    prisma.videoSupporterSummary.findMany({
      where: { videoId },
      orderBy: { totalCoinsSent: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
          },
        },
      },
    }),
  ]);

  const giftCountByType: GiftCountByType[] = byType.map((row) => ({
    giftId: row.gift.id,
    giftSlug: row.gift.slug,
    giftName: row.gift.name,
    coinCost: row.gift.coinCost,
    count: row.count,
  }));

  const topSupporters: TopSupporter[] = supporters.map((row) => ({
    userId: row.user.id,
    username: row.user.username,
    displayName: row.user.displayName,
    avatarUrl: row.user.avatarUrl,
    country: row.user.country ?? null,
    totalCoinsSent: row.totalCoinsSent,
    giftsCount: row.giftsCount,
  }));

  return {
    totalCoinsReceived: video.coinsCount,
    totalGiftsReceived: video.giftsCount,
    giftCountByType,
    topSupporters,
  };
}

export type RecentVideoGift = {
  id: string;
  senderName: string;
  giftName: string;
  coinAmount: number;
  createdAt: string;
};

/**
 * Returns recent gift transactions for a video (for activity feed on video page).
 */
export async function getRecentVideoGifts(
  videoId: string,
  limit = 10
): Promise<RecentVideoGift[]> {
  const rows = await prisma.giftTransaction.findMany({
    where: { videoId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 20),
    include: {
      sender: { select: { displayName: true, username: true } },
      gift: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    senderName: row.sender.displayName || row.sender.username,
    giftName: row.gift.name,
    coinAmount: row.coinAmount,
    createdAt: row.createdAt.toISOString(),
  }));
}
