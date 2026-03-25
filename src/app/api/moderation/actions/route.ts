import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { performModerationAction } from '@/services/moderation-action.service';
import type { ModerationActionType, ModerationTargetType } from '@prisma/client';

const VALID_ACTION_TYPES: ModerationActionType[] = [
  'APPROVE', 'FLAG', 'LIMIT_DISCOVERY', 'REMOVE_FROM_CHALLENGE', 'BLOCK_VIDEO', 'DELETE_VIDEO',
  'WARN', 'WATCHLIST', 'RESTRICT_SUPPORT', 'SUSPEND', 'BAN',
  'VALIDATE_SUPPORT', 'EXCLUDE_FROM_RANKING', 'VOID_SUPPORT', 'REFUND', 'SEND_TO_FRAUD_REVIEW', 'FREEZE_PAYOUT', 'CLEAR_RISK_STATE',
  'EXCLUDE_ENTRY_SUPPORT', 'FREEZE_ENTRY', 'DISQUALIFY_ENTRY', 'RESTORE_ENTRY',
  'APPROVE_VERIFICATION', 'REJECT_VERIFICATION', 'REVOKE_VERIFICATION', 'REQUEST_MORE_INFO',
  'DISMISS_REPORT', 'UPHOLD_REPORT', 'CLEAR_VIDEO_FLAGS',
];
const VALID_TARGET_TYPES: ModerationTargetType[] = ['VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY', 'CREATOR_VERIFICATION', 'CONTENT_REPORT'];

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

  let body: { targetType?: string; targetId?: string; actionType?: string; previousStatus?: string | null; newStatus?: string | null; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const { targetType, targetId, actionType, previousStatus, newStatus, note } = body;
  if (!targetType || !VALID_TARGET_TYPES.includes(targetType as ModerationTargetType) || !targetId || !actionType || !VALID_ACTION_TYPES.includes(actionType as ModerationActionType)) {
    return NextResponse.json({ ok: false, message: 'Invalid targetType, targetId, or actionType' }, { status: 400 });
  }

  try {
    await performModerationAction({
      moderatorId,
      targetType: targetType as ModerationTargetType,
      targetId,
      actionType: actionType as ModerationActionType,
      previousStatus: previousStatus ?? null,
      newStatus: newStatus ?? null,
      note: note ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[moderation/actions]', e);
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Action failed' }, { status: 500 });
  }
}
