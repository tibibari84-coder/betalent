import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addModerationNote } from '@/services/moderation-action.service';
import type { ModerationTargetType } from '@prisma/client';

const VALID_TARGET_TYPES: ModerationTargetType[] = ['VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY'];

export async function POST(req: Request) {
  let moderatorId: string;
  try {
    const user = await requireAdmin();
    moderatorId = user.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  let body: { targetType?: string; targetId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const { targetType, targetId, note } = body;
  if (!targetType || !VALID_TARGET_TYPES.includes(targetType as ModerationTargetType) || !targetId || typeof note !== 'string' || !note.trim()) {
    return NextResponse.json({ ok: false, message: 'Invalid targetType, targetId, or note' }, { status: 400 });
  }

  try {
    await addModerationNote({
      moderatorId,
      targetType: targetType as ModerationTargetType,
      targetId,
      note: note.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[moderation/notes]', e);
    return NextResponse.json({ ok: false, message: 'Failed to add note' }, { status: 500 });
  }
}
