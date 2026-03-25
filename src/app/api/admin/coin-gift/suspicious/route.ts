import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSuspiciousGiftingFlags } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
    const highFrequencyMinCount = searchParams.get('highFrequencyMinCount')
      ? Number(searchParams.get('highFrequencyMinCount'))
      : undefined;
    const highFrequencyWindowMinutes = searchParams.get('highFrequencyWindowMinutes')
      ? Number(searchParams.get('highFrequencyWindowMinutes'))
      : undefined;
    const largeTransactionMinCoins = searchParams.get('largeTransactionMinCoins')
      ? Number(searchParams.get('largeTransactionMinCoins'))
      : undefined;
    const burstMinCount = searchParams.get('burstMinCount') ? Number(searchParams.get('burstMinCount')) : undefined;
    const burstWindowMinutes = searchParams.get('burstWindowMinutes')
      ? Number(searchParams.get('burstWindowMinutes'))
      : undefined;

    const flags = await getSuspiciousGiftingFlags({
      since,
      highFrequencyMinCount,
      highFrequencyWindowMinutes,
      largeTransactionMinCoins,
      burstMinCount,
      burstWindowMinutes,
    });
    return NextResponse.json({ ok: true, flags });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
