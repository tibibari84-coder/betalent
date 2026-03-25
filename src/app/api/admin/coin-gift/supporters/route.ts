import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getHighVolumeSupporters } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const minCoinsSpent = searchParams.get('minCoinsSpent') ? Number(searchParams.get('minCoinsSpent')) : undefined;

    const supporters = await getHighVolumeSupporters({ limit, minCoinsSpent });
    return NextResponse.json({ ok: true, supporters });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
