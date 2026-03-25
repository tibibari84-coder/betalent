/**
 * GET /api/creator/earnings
 * Returns the authenticated user's creator earnings (gift-only).
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSummaryOrZero } from '@/services/creator-earnings.service';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireAuth();
    const [summary, riskHold] = await Promise.all([
      getSummaryOrZero(user.id),
      prisma.creatorEarningsRiskHold.aggregate({
        where: { creatorId: user.id, status: { in: ['PENDING', 'PARTIAL', 'BLOCKED'] } },
        _sum: { atRiskCoins: true },
      }),
    ]);
    const unsettledAtRiskCoins = riskHold._sum.atRiskCoins ?? 0;
    return NextResponse.json({
      ok: true,
      earnings: {
        availableEarningsCoins: Math.max(0, summary.availableEarningsCoins - unsettledAtRiskCoins),
        totalEarningsCoins: summary.totalEarningsCoins,
        totalGiftsReceivedCount: summary.totalGiftsReceivedCount,
        pendingPayoutCoins: summary.pendingPayoutCoins + unsettledAtRiskCoins,
        unsettledAtRiskCoins,
        finality: unsettledAtRiskCoins > 0 ? 'UNSETTLED_DUE_TO_REFUNDS_OR_DISPUTES' : 'SETTLED',
        updatedAt: summary.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load earnings' }, { status: 500 });
  }
}
