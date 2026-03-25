import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getVideoModerationDetail,
  getAccountModerationDetail,
  getSupportFlagModerationDetail,
  getChallengeEntryModerationDetail,
} from '@/services/moderation-queue.service';
import { getVerificationDetailForModeration } from '@/services/creator-verification.service';
import { getModerationAudit } from '@/services/moderation-action.service';

const VALID_TARGET_TYPES = ['VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY', 'CREATOR_VERIFICATION'] as const;

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

  if (!targetType || !VALID_TARGET_TYPES.includes(targetType as (typeof VALID_TARGET_TYPES)[number]) || !targetId) {
    return NextResponse.json({ ok: false, message: 'Missing or invalid targetType/targetId' }, { status: 400 });
  }

  try {
    if (targetType === 'VIDEO') {
      const detail = await getVideoModerationDetail(targetId);
      return NextResponse.json({ ok: true, targetType: 'VIDEO', detail });
    }
    if (targetType === 'USER') {
      const detail = await getAccountModerationDetail(targetId);
      return NextResponse.json({ ok: true, targetType: 'USER', detail });
    }
    if (targetType === 'SUPPORT_FLAG') {
      const detail = await getSupportFlagModerationDetail(targetId);
      return NextResponse.json({ ok: true, targetType: 'SUPPORT_FLAG', detail });
    }
    if (targetType === 'CHALLENGE_ENTRY') {
      const detail = await getChallengeEntryModerationDetail(targetId);
      return NextResponse.json({ ok: true, targetType: 'CHALLENGE_ENTRY', detail });
    }
    if (targetType === 'CREATOR_VERIFICATION') {
      const [verificationDetail, audit] = await Promise.all([
        getVerificationDetailForModeration(targetId),
        getModerationAudit('CREATOR_VERIFICATION', targetId),
      ]);
      if (!verificationDetail) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
      const detail = {
        ...verificationDetail,
        moderationEventHistory: audit.actions,
        notes: audit.notes,
      };
      return NextResponse.json({ ok: true, targetType: 'CREATOR_VERIFICATION', detail });
    }
    return NextResponse.json({ ok: false, message: 'Unsupported targetType' }, { status: 400 });
  } catch (e) {
    console.error('[moderation/detail]', e);
    return NextResponse.json({ ok: false, message: 'Failed to fetch detail' }, { status: 500 });
  }
}
