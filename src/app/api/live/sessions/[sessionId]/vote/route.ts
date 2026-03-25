/**
 * POST /api/live/sessions/[sessionId]/vote
 * Body: { performerUserId: string, stars: number }
 * Submit or update live vote (1–5 stars)
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { submitLiveVote } from '@/services/live-challenge.service';

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

    const body = (await req.json()) as { performerUserId?: string; stars?: number };
    const performerUserId = typeof body.performerUserId === 'string' ? body.performerUserId.trim() : '';
    const stars = typeof body.stars === 'number' ? body.stars : NaN;

    if (!performerUserId) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_PERFORMER' },
        { status: 400 }
      );
    }

    const result = await submitLiveVote({
      sessionId,
      performerUserId,
      voterUserId: user.id,
      stars,
    });

    if (!result.ok) {
      const status =
        result.code === 'SESSION_NOT_FOUND'
          ? 404
          : result.code === 'SELF_VOTE'
            ? 403
            : result.code === 'RATE_LIMIT'
              ? 429
              : result.code === 'UNAUTHORIZED'
                ? 401
                : 400;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      updated: result.updated,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
