import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/coins/purchase/status?session_id=cs_...
 * Truthful purchase status: derived from backend order state, not redirect alone.
 */
export async function GET(req: Request) {
  try {
    const user = await requireVerifiedUser();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id')?.trim() ?? '';
    if (!sessionId) {
      return NextResponse.json({ ok: false, code: 'SESSION_REQUIRED' }, { status: 400 });
    }

    const order = await prisma.coinPurchaseOrder.findFirst({
      where: {
        userId: user.id,
        provider: 'STRIPE',
        providerReferenceId: sessionId,
      },
      select: {
        id: true,
        status: true,
        riskStatus: true,
        reversalStatus: true,
        refundedCents: true,
        reversedCoins: true,
        unrecoveredCoins: true,
        coins: true,
        amountCents: true,
        currency: true,
        completedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, code: 'ORDER_NOT_FOUND' }, { status: 404 });
    }

    const state =
      order.reversalStatus === 'PENDING'
        ? 'reversal_pending'
        : order.reversalStatus === 'PARTIAL'
          ? 'partially_reversed'
          : order.riskStatus === 'DISPUTE_OPEN'
            ? 'disputed'
            : order.status === 'COMPLETED'
        ? 'confirmed'
        : order.status === 'FAILED'
          ? 'failed'
          : order.status === 'REFUNDED'
            ? 'refunded'
            : 'pending';

    return NextResponse.json({
      ok: true,
      state,
      order: {
        id: order.id,
        status: order.status,
        riskStatus: order.riskStatus,
        reversalStatus: order.reversalStatus,
        refundedCents: order.refundedCents,
        reversedCoins: order.reversedCoins,
        unrecoveredCoins: order.unrecoveredCoins,
        coins: order.coins,
        amountCents: order.amountCents,
        currency: order.currency,
        completedAt: order.completedAt?.toISOString() ?? null,
      },
      refundBehavior:
        order.status === 'REFUNDED' || order.riskStatus !== 'NONE'
          ? 'Refund/dispute handling is conservative: only safely reversible unspent coins are reversed automatically. Remaining liability is tracked.'
          : null,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json({ ok: false, message: 'Email verification required' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to check purchase status' }, { status: 500 });
  }
}
