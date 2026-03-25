import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listCoinPackagesAdmin } from '@/services/admin-visibility.service';

export async function GET() {
  try {
    await requireAdmin();
    const packages = await listCoinPackagesAdmin();
    return NextResponse.json({ ok: true, packages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
