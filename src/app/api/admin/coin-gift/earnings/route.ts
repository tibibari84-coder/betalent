import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getCreatorEarningsSummaries } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const minEarnings = searchParams.get('minEarnings') ? Number(searchParams.get('minEarnings')) : undefined;

    const summaries = await getCreatorEarningsSummaries({ limit, minEarnings });
    return NextResponse.json({ ok: true, summaries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
