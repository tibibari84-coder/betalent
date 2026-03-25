import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getGiftAbuseFlags } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
    const kind = searchParams.get('kind') ?? undefined;
    const senderId = searchParams.get('senderId') ?? undefined;

    const flags = await getGiftAbuseFlags({ limit, since, kind, senderId });
    return NextResponse.json({ ok: true, flags });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
