/**
 * POST /api/live/sessions/[sessionId]/gift
 * Body: { performerUserId: string, coins: number }
 * Send coins as gift during live performance
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendLiveGift } from '@/services/live-challenge.service';

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth();
    const sessionId = params.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const body = (await req.json()) as { performerUserId?: string; coins?: number };
    const performerUserId = typeof body.performerUserId === 'string' ? body.performerUserId.trim() : '';
    const coins = typeof body.coins === 'number' ? body.coins : NaN;

    if (!performerUserId) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_PERFORMER' },
        { status: 400 }
      );
    }

    const result = await sendLiveGift({
      sessionId,
      performerUserId,
      senderUserId: user.id,
      coins,
    });

    if (!result.ok) {
      const status =
        result.code === 'SESSION_NOT_FOUND'
          ? 404
          : result.code === 'SELF_GIFT'
            ? 403
            : result.code === 'RATE_LIMIT'
              ? 429
              : result.code === 'INSUFFICIENT_BALANCE'
                ? 400
                : result.code === 'UNAUTHORIZED'
                  ? 401
                  : 400;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
