import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getModerationAudit } from '@/services/moderation-action.service';
import type { ModerationTargetType } from '@prisma/client';

const VALID_TARGET_TYPES: ModerationTargetType[] = ['VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY'];

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
  const targetId = searchParams.get('targetId');

  if (!targetType || !VALID_TARGET_TYPES.includes(targetType as ModerationTargetType) || !targetId) {
    return NextResponse.json({ ok: false, message: 'Missing or invalid targetType/targetId' }, { status: 400 });
  }

  try {
    const audit = await getModerationAudit(targetType as ModerationTargetType, targetId);
    return NextResponse.json({ ok: true, ...audit });
  } catch (e) {
    console.error('[moderation/audit]', e);
    return NextResponse.json({ ok: false, message: 'Failed to fetch audit' }, { status: 500 });
  }
}
