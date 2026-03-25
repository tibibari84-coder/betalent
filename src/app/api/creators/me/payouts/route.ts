import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPayoutHistory } from '@/services/payout-preparation.service';

/**
 * GET /api/creators/me/payouts
 * Returns the authenticated creator's payout history (CreatorPayoutRecord).
 * Preparation only; no real payouts executed yet.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
    const payouts = await getPayoutHistory(user.id, limit);
    return NextResponse.json({ ok: true, payouts });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}
