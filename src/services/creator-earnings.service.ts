import { prisma } from '@/lib/prisma';

/**
 * Creator earnings: gift-only. Not mixed with likes or votes.
 *
 * Source of truth is CreatorEarningsLedger (sourceType GIFT_TRANSACTION only).
 * CreatorEarningsSummary is updated in the same tx as ledger writes in gift.service.
 */

export type CreatorEarningsSummary = {
  availableEarningsCoins: number;
  totalEarningsCoins: number;
  totalGiftsReceivedCount: number;
  pendingPayoutCoins: number;
  updatedAt: Date;
};

const ZERO_SUMMARY: CreatorEarningsSummary = {
  availableEarningsCoins: 0,
  totalEarningsCoins: 0,
  totalGiftsReceivedCount: 0,
  pendingPayoutCoins: 0,
  updatedAt: new Date(0),
};

/**
 * Returns the creator's earnings summary from the summary table (fast path).
 * Returns null if the creator has never received a gift (no row yet).
 */
export async function getSummary(creatorId: string): Promise<CreatorEarningsSummary | null> {
  const row = await prisma.creatorEarningsSummary.findUnique({
    where: { creatorId },
  });
  if (!row) return null;
  return {
    availableEarningsCoins: row.availableEarningsCoins,
    totalEarningsCoins: row.totalEarningsCoins,
    totalGiftsReceivedCount: row.totalGiftsReceivedCount,
    pendingPayoutCoins: row.pendingPayoutCoins,
    updatedAt: row.updatedAt,
  };
}

/**
 * Returns the creator's earnings summary, or a zeroed summary if no row exists.
 * Use for API responses so the client always gets a consistent shape.
 */
export async function getSummaryOrZero(creatorId: string): Promise<CreatorEarningsSummary> {
  const summary = await getSummary(creatorId);
  return summary ?? { ...ZERO_SUMMARY, updatedAt: new Date() };
}

/**
 * Recomputes summary from CreatorEarningsLedger and optionally updates the summary row.
 * Use for audit, repair, or after backfilling ledger data.
 * Does not change pendingPayoutCoins (that is payout-state; reconcile only fixes earned totals).
 */
export async function reconcileFromLedger(
  creatorId: string,
  options: { persist?: boolean } = { persist: true }
): Promise<{
  availableEarningsCoins: number;
  totalEarningsCoins: number;
  totalGiftsReceivedCount: number;
  fromLedger: boolean;
}> {
  const agg = await prisma.creatorEarningsLedger.aggregate({
    where: {
      creatorId,
      sourceType: 'GIFT_TRANSACTION',
    },
    _sum: { creatorShareCoins: true },
    _count: true,
  });
  const totalEarningsCoins = agg._sum.creatorShareCoins ?? 0;
  const totalGiftsReceivedCount = agg._count;
  const existing = await prisma.creatorEarningsSummary.findUnique({
    where: { creatorId },
  });
  const pendingPayoutCoins = existing?.pendingPayoutCoins ?? 0;
  const availableEarningsCoins = Math.max(0, totalEarningsCoins - pendingPayoutCoins);

  if (options.persist) {
    await prisma.creatorEarningsSummary.upsert({
      where: { creatorId },
      create: {
        creatorId,
        availableEarningsCoins,
        totalEarningsCoins,
        totalGiftsReceivedCount,
        pendingPayoutCoins,
      },
      update: {
        availableEarningsCoins,
        totalEarningsCoins,
        totalGiftsReceivedCount,
        pendingPayoutCoins,
      },
    });
  }

  return {
    availableEarningsCoins,
    totalEarningsCoins,
    totalGiftsReceivedCount,
    fromLedger: true,
  };
}
