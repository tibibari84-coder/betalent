import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCreatorEarningsDashboard } from '@/services/creator-dashboard.service';
import { getPayoutReadiness } from '@/services/payout-preparation.service';

/**
 * GET /api/creators/me/payout-readiness
 * Returns server-calculated payout readiness state. No real payout execution.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const dashboard = await getCreatorEarningsDashboard(user.id, {
      activityLimit: 1,
      topPerformancesLimit: 0,
    });
    const readiness = await getPayoutReadiness(
      user.id,
      dashboard.summary.estimatedWithdrawableCoins,
      dashboard.summary.pendingCoins
    );
    return NextResponse.json({ ok: true, readiness });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}
