import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPlatformRevenueFromGifts } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
    const until = searchParams.get('until') ? new Date(searchParams.get('until')!) : undefined;

    const revenue = await getPlatformRevenueFromGifts({ since, until });
    return NextResponse.json({ ok: true, revenue });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
