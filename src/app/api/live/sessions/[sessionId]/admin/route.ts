/**
 * POST /api/live/sessions/[sessionId]/admin
 * Admin: start session, move to next performer, end session
 * Body: { action: 'start' | 'next' | 'end' }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitLiveSessionEvent } from '@/lib/live-session-events';
import { getLiveLeaderboard } from '@/services/live-challenge.service';
import { LIVE_SLOT_DURATION_SEC } from '@/constants/live-challenge';

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

    const admin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = (await req.json()) as { action?: string };
    const action = typeof body.action === 'string' ? body.action : '';

    const session = await prisma.liveChallengeSession.findUnique({
      where: { id: sessionId },
      include: {
        slots: { orderBy: { slotOrder: 'asc' } },
        window: true,
      },
    });

    if (!session) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    if (action === 'start') {
      if (session.status !== 'SCHEDULED') {
        return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 400 });
      }
      const firstSlot = session.slots[0];
      if (!firstSlot) {
        return NextResponse.json({ ok: false, code: 'NO_SLOTS' }, { status: 400 });
      }
      const now = new Date();
      const endTime = new Date(now.getTime() + LIVE_SLOT_DURATION_SEC * 1000);
      await prisma.$transaction(async (tx) => {
        await tx.liveChallengeSession.update({
          where: { id: sessionId },
          data: {
            status: 'LIVE',
            startedAt: now,
            currentPerformerId: firstSlot.performerUserId,
          },
        });
        await tx.livePerformanceSlot.update({
          where: { id: firstSlot.id },
          data: { status: 'LIVE', startTime: now, endTime },
        });
        if (session.windowId) {
          await tx.challengeWindow.update({
            where: { id: session.windowId },
            data: { status: 'LIVE' },
          });
        }
      });
      const leaderboard = await getLiveLeaderboard(sessionId);
      emitLiveSessionEvent(sessionId, {
        type: 'session_update',
        payload: { status: 'LIVE', currentPerformerId: firstSlot.performerUserId },
      });
      emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
      return NextResponse.json({ ok: true, status: 'LIVE' });
    }

    if (action === 'next') {
      if (session.status !== 'LIVE') {
        return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 400 });
      }
      const currentIdx = session.slots.findIndex(
        (s) => s.performerUserId === session.currentPerformerId
      );
      const nextSlot = session.slots[currentIdx + 1];
      if (currentIdx >= 0) {
        await prisma.livePerformanceSlot.update({
          where: { id: session.slots[currentIdx].id },
          data: { status: 'COMPLETED', endTime: new Date() },
        });
      }
      if (!nextSlot) {
        await prisma.$transaction(async (tx) => {
          await tx.liveChallengeSession.update({
            where: { id: sessionId },
            data: { status: 'ENDED', endedAt: new Date(), currentPerformerId: null },
          });
          if (session.windowId) {
            await tx.challengeWindow.update({
              where: { id: session.windowId },
              data: { status: 'COMPLETED' },
            });
          }
        });
        const leaderboard = await getLiveLeaderboard(sessionId);
        emitLiveSessionEvent(sessionId, {
          type: 'session_update',
          payload: { status: 'ENDED', currentPerformerId: null },
        });
        emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
        return NextResponse.json({ ok: true, status: 'ENDED' });
      }
      const now = new Date();
      const endTime = new Date(now.getTime() + LIVE_SLOT_DURATION_SEC * 1000);
      await prisma.$transaction([
        prisma.liveChallengeSession.update({
          where: { id: sessionId },
          data: {
            currentPerformerId: nextSlot.performerUserId,
            roundNumber: currentIdx + 2,
          },
        }),
        prisma.livePerformanceSlot.update({
          where: { id: nextSlot.id },
          data: { status: 'LIVE', startTime: now, endTime },
        }),
      ]);
      const leaderboard = await getLiveLeaderboard(sessionId);
      emitLiveSessionEvent(sessionId, {
        type: 'current_performer',
        payload: { currentPerformerId: nextSlot.performerUserId },
      });
      emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
      return NextResponse.json({ ok: true, status: 'LIVE', roundNumber: currentIdx + 2 });
    }

    if (action === 'end') {
      if (session.status !== 'LIVE') {
        return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 400 });
      }
      const now = new Date();
      const currentIdx = session.slots.findIndex(
        (s) => s.performerUserId === session.currentPerformerId
      );
      await prisma.$transaction(async (tx) => {
        await tx.liveChallengeSession.update({
          where: { id: sessionId },
          data: { status: 'ENDED', endedAt: now, currentPerformerId: null },
        });
        if (currentIdx >= 0) {
          await tx.livePerformanceSlot.update({
            where: { id: session.slots[currentIdx].id },
            data: { status: 'COMPLETED', endTime: now },
          });
        }
        if (session.windowId) {
          await tx.challengeWindow.update({
            where: { id: session.windowId },
            data: { status: 'COMPLETED' },
          });
        }
      });
      const leaderboard = await getLiveLeaderboard(sessionId);
      emitLiveSessionEvent(sessionId, {
        type: 'session_update',
        payload: { status: 'ENDED', currentPerformerId: null },
      });
      emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
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
