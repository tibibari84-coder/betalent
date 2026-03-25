import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getModerationQueue } from '@/services/moderation-queue.service';
import { MODERATION_QUEUE_TYPES } from '@/constants/moderation';
import type { ModerationQueueType } from '@/constants/moderation';

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const queueType = searchParams.get('queueType') as ModerationQueueType | null;
  if (!queueType || !MODERATION_QUEUE_TYPES.includes(queueType)) {
    return NextResponse.json({ ok: false, message: 'Invalid queueType' }, { status: 400 });
  }

  const filters = {
    queueType,
    riskLevel: searchParams.get('riskLevel') ?? undefined,
    moderationStatus: searchParams.get('moderationStatus') ?? undefined,
    integrityStatus: searchParams.get('integrityStatus') ?? undefined,
    reportType: searchParams.get('reportType') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    creatorId: searchParams.get('creatorId') ?? undefined,
    challengeId: searchParams.get('challengeId') ?? undefined,
    payoutBlocked: searchParams.get('payoutBlocked') === 'true' ? true : searchParams.get('payoutBlocked') === 'false' ? false : undefined,
    search: searchParams.get('search') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
  };

  try {
    const result = await getModerationQueue(filters);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[moderation/queues]', e);
    return NextResponse.json({ ok: false, message: 'Failed to fetch queue' }, { status: 500 });
  }
}
