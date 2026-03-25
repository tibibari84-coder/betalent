import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listGiftCatalogAdmin } from '@/services/admin-visibility.service';

export async function GET() {
  try {
    await requireAdmin();
    const catalog = await listGiftCatalogAdmin();
    return NextResponse.json({ ok: true, catalog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
