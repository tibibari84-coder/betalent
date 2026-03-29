/**
 * POST /api/live/sessions/[sessionId]/admin
 * Admin: start session, move to next performer, end session (watch-party orchestration — not RTMP ingest).
 * Body: { action: 'start' | 'next' | 'end' }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  performLiveSessionEnd,
  performLiveSessionNext,
  performLiveSessionStart,
} from '@/services/live-challenge-orchestration.service';

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireAuth();
    const sessionId = params.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = (await req.json()) as { action?: string };
    const action = typeof body.action === 'string' ? body.action : '';

    const exists = await prisma.liveChallengeSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    if (action === 'start') {
      const r = await performLiveSessionStart(sessionId);
      if (!r.ok) {
        const status =
          r.code === 'NOT_FOUND'
            ? 404
            : r.code === 'INVALID_STATE' || r.code === 'NO_SLOTS'
              ? 400
              : r.code === 'WINDOW_CANCELLED' ||
                  r.code === 'WINDOW_ALREADY_COMPLETED' ||
                  r.code === 'WINDOW_ENDED'
                ? 409
                : 400;
        return NextResponse.json({ ok: false, code: r.code, message: r.message }, { status });
      }
      return NextResponse.json({ ok: true, status: 'LIVE' });
    }

    if (action === 'next') {
      const r = await performLiveSessionNext(sessionId, { requireSlotExpired: false, source: 'admin' });
      if (!r.ok) {
        const status =
          r.code === 'NOT_FOUND'
            ? 404
            : r.code === 'INTERNAL'
              ? 500
              : 400;
        return NextResponse.json({ ok: false, code: r.code, message: r.message }, { status });
      }
      return NextResponse.json({
        ok: true,
        status: r.status,
        ...(r.status === 'LIVE' && typeof r.roundNumber === 'number' ? { roundNumber: r.roundNumber } : {}),
      });
    }

    if (action === 'end') {
      const r = await performLiveSessionEnd(sessionId);
      if (!r.ok) {
        const status = r.code === 'NOT_FOUND' ? 404 : r.code === 'INVALID_STATE' ? 400 : 500;
        return NextResponse.json({ ok: false, code: r.code, message: r.message }, { status });
      }
      return NextResponse.json({ ok: true, status: 'ENDED' });
    }

    return NextResponse.json({ ok: false, code: 'INVALID_ACTION' }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
