import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getGiftTransactionLogs } from '@/services/admin-visibility.service';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const cursor = searchParams.get('cursor') ?? undefined;
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
    const until = searchParams.get('until') ? new Date(searchParams.get('until')!) : undefined;
    const senderId = searchParams.get('senderId') ?? undefined;
    const receiverId = searchParams.get('receiverId') ?? undefined;

    const result = await getGiftTransactionLogs({
      limit,
      cursor,
      since,
      until,
      senderId,
      receiverId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ ok: false, message: msg }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
