import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getModerationActionLogs } from '@/services/moderation-action.service';
import type { ModerationTargetType } from '@prisma/client';

const VALID_TARGET_TYPES: ModerationTargetType[] = ['VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY', 'CREATOR_VERIFICATION', 'CONTENT_REPORT'];

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('targetType');
  const moderatorId = searchParams.get('moderatorId') ?? undefined;
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const cursor = searchParams.get('cursor') ?? undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const filters = {
    ...(targetType && VALID_TARGET_TYPES.includes(targetType as ModerationTargetType) && { targetType: targetType as ModerationTargetType }),
    moderatorId,
    dateFrom,
    dateTo,
    search,
    cursor,
    limit,
  };

  try {
    const result = await getModerationActionLogs(filters);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[moderation/logs]', e);
    return NextResponse.json({ ok: false, message: 'Failed to fetch logs' }, { status: 500 });
  }
}
