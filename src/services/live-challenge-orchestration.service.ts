/**
 * Live challenge session orchestration: slot transitions, window coupling, auto-advance.
 *
 * This is a synchronized watch-party / pre-recorded stage model — not WebRTC/RTMP ingest.
 * Sessions may exist without a ChallengeWindow (windowId null); window updates apply only when linked.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitLiveSessionEvent } from '@/lib/live-session-events';
import { getLiveLeaderboard } from '@/services/live-challenge.service';
import { LIVE_SLOT_DURATION_SEC } from '@/constants/live-challenge';

export type LiveAdvanceSource = 'admin' | 'auto_poll' | 'auto_cron';

export type PerformNextResult =
  | { ok: true; status: 'LIVE' | 'ENDED'; roundNumber?: number }
  | { ok: false; code: string; message?: string };

/** Structured ops log (grep: [live-session]) */
function logLiveTransition(
  source: LiveAdvanceSource,
  sessionId: string,
  action: string,
  detail: Record<string, unknown>
) {
  console.info(
    '[live-session]',
    JSON.stringify({ ts: new Date().toISOString(), source, sessionId, action, ...detail })
  );
}

/**
 * Advances the show one slot: completes current LIVE slot, activates next WAITING or ends session.
 * Uses row lock on LiveChallengeSession to reduce double-advance races (multi-instance: still use cron backup).
 *
 * @param requireSlotExpired - true = only advance when current LIVE slot endTime <= now (auto). false = admin manual next.
 */
export async function performLiveSessionNext(
  sessionId: string,
  options: { requireSlotExpired: boolean; source: LiveAdvanceSource }
): Promise<PerformNextResult> {
  const { requireSlotExpired, source } = options;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT 1 FROM "LiveChallengeSession" WHERE id = ${sessionId} FOR UPDATE`
      );

      const session = await tx.liveChallengeSession.findUnique({
        where: { id: sessionId },
        include: {
          slots: { orderBy: { slotOrder: 'asc' } },
          window: { select: { id: true, status: true } },
        },
      });

      if (!session) {
        return { type: 'err' as const, code: 'NOT_FOUND' };
      }
      if (session.status !== 'LIVE') {
        return { type: 'err' as const, code: 'INVALID_STATE', detail: { status: session.status } };
      }

      const currentIdx = session.slots.findIndex((s) => s.performerUserId === session.currentPerformerId);
      if (currentIdx < 0) {
        return { type: 'err' as const, code: 'NO_CURRENT_SLOT', detail: { currentPerformerId: session.currentPerformerId } };
      }

      const currentSlot = session.slots[currentIdx];
      if (currentSlot.status !== 'LIVE') {
        return {
          type: 'err' as const,
          code: 'NO_LIVE_SLOT',
          detail: { slotId: currentSlot.id, status: currentSlot.status },
        };
      }

      const now = new Date();
      if (requireSlotExpired) {
        if (!currentSlot.endTime || currentSlot.endTime > now) {
          return { type: 'skip' as const, reason: 'SLOT_NOT_EXPIRED' };
        }
      }

      const nextSlot = session.slots[currentIdx + 1];

      await tx.livePerformanceSlot.update({
        where: { id: currentSlot.id },
        data: { status: 'COMPLETED', endTime: now },
      });

      if (!nextSlot) {
        await tx.liveChallengeSession.update({
          where: { id: sessionId },
          data: { status: 'ENDED', endedAt: now, currentPerformerId: null },
        });
        if (session.windowId) {
          await tx.challengeWindow.update({
            where: { id: session.windowId },
            data: { status: 'COMPLETED' },
          });
        }
        return { type: 'ended' as const };
      }

      const endTime = new Date(now.getTime() + LIVE_SLOT_DURATION_SEC * 1000);
      await tx.liveChallengeSession.update({
        where: { id: sessionId },
        data: {
          currentPerformerId: nextSlot.performerUserId,
          roundNumber: currentIdx + 2,
        },
      });
      await tx.livePerformanceSlot.update({
        where: { id: nextSlot.id },
        data: { status: 'LIVE', startTime: now, endTime },
      });

      return {
        type: 'live' as const,
        roundNumber: currentIdx + 2,
        nextPerformerId: nextSlot.performerUserId,
      };
    });

    if (result.type === 'err') {
      logLiveTransition(source, sessionId, 'next_blocked', { code: result.code, ...('detail' in result ? result.detail : {}) });
      return {
        ok: false,
        code: result.code,
        message:
          result.code === 'NOT_FOUND'
            ? 'Session not found'
            : result.code === 'INVALID_STATE'
              ? 'Session is not LIVE'
              : result.code === 'NO_LIVE_SLOT'
                ? 'No active LIVE slot to advance from'
                : result.code === 'NO_CURRENT_SLOT'
                  ? 'Current performer does not match any slot'
                  : 'Cannot advance',
      };
    }

    if (result.type === 'skip') {
      return { ok: false, code: result.reason };
    }

    const leaderboard = await getLiveLeaderboard(sessionId);

    if (result.type === 'ended') {
      emitLiveSessionEvent(sessionId, {
        type: 'session_update',
        payload: { status: 'ENDED', currentPerformerId: null },
      });
      emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
      logLiveTransition(source, sessionId, 'next_ended', {});
      return { ok: true, status: 'ENDED' };
    }

    emitLiveSessionEvent(sessionId, {
      type: 'current_performer',
      payload: { currentPerformerId: result.nextPerformerId },
    });
    emitLiveSessionEvent(sessionId, {
      type: 'session_update',
      payload: { status: 'LIVE', currentPerformerId: result.nextPerformerId },
    });
    emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
    logLiveTransition(source, sessionId, 'next_live', { roundNumber: result.roundNumber });
    return { ok: true, status: 'LIVE', roundNumber: result.roundNumber };
  } catch (e) {
    console.error('[live-session] performLiveSessionNext failed', sessionId, e);
    return { ok: false, code: 'INTERNAL', message: 'Advance failed' };
  }
}

/**
 * Maintenance / cron: advance sessions whose LIVE slot has passed endTime.
 */
export async function runLiveSessionAutoAdvanceJob(): Promise<number> {
  const now = new Date();
  const candidates = await prisma.liveChallengeSession.findMany({
    where: {
      status: 'LIVE',
      slots: {
        some: {
          status: 'LIVE',
          endTime: { not: null, lte: now },
        },
      },
    },
    select: { id: true },
  });

  let advanced = 0;
  for (const { id } of candidates) {
    const r = await performLiveSessionNext(id, { requireSlotExpired: true, source: 'auto_cron' });
    if (r.ok) advanced += 1;
  }
  return advanced;
}

/**
 * Poll-driven auto-advance: call from GET /api/live/sessions/[id] so viewers trigger expiry without waiting for cron.
 */
export async function tryAutoAdvanceExpiredSlotOnPoll(sessionId: string): Promise<void> {
  const r = await performLiveSessionNext(sessionId, { requireSlotExpired: true, source: 'auto_poll' });
  if (r.ok) {
    logLiveTransition('auto_poll', sessionId, 'poll_auto_advanced', { status: r.status });
  }
}

export type SessionStartResult = { ok: true } | { ok: false; code: string; message?: string };
export type SessionEndResult = { ok: true } | { ok: false; code: string; message?: string };

/**
 * Operator start: first slot LIVE, session LIVE, optional window → LIVE.
 */
export async function performLiveSessionStart(sessionId: string): Promise<SessionStartResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT 1 FROM "LiveChallengeSession" WHERE id = ${sessionId} FOR UPDATE`
      );

      const session = await tx.liveChallengeSession.findUnique({
        where: { id: sessionId },
        include: {
          slots: { orderBy: { slotOrder: 'asc' } },
          window: { select: { id: true, status: true, endsAt: true, startsAt: true } },
        },
      });

      if (!session) return { type: 'err' as const, code: 'NOT_FOUND' };
      if (session.status !== 'SCHEDULED') {
        return { type: 'err' as const, code: 'INVALID_STATE', detail: { status: session.status } };
      }
      const firstSlot = session.slots[0];
      if (!firstSlot) return { type: 'err' as const, code: 'NO_SLOTS' };

      const w = session.window;
      if (w) {
        if (w.status === 'CANCELLED') {
          return { type: 'err' as const, code: 'WINDOW_CANCELLED' };
        }
        if (w.status === 'COMPLETED') {
          return { type: 'err' as const, code: 'WINDOW_ALREADY_COMPLETED' };
        }
        const now = new Date();
        if (w.endsAt < now) {
          return { type: 'err' as const, code: 'WINDOW_ENDED' };
        }
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + LIVE_SLOT_DURATION_SEC * 1000);

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

      return { type: 'ok' as const, firstPerformerId: firstSlot.performerUserId };
    });

    if (result.type === 'err') {
      logLiveTransition('admin', sessionId, 'start_blocked', { code: result.code });
      const messages: Record<string, string> = {
        NOT_FOUND: 'Session not found',
        INVALID_STATE: 'Session must be SCHEDULED to start (not already LIVE or ENDED)',
        NO_SLOTS: 'No performance slots — add challenge entries first',
        WINDOW_CANCELLED: 'Linked challenge window is cancelled',
        WINDOW_ALREADY_COMPLETED: 'Linked challenge window is already completed',
        WINDOW_ENDED: 'Linked challenge window end time has passed',
      };
      return {
        ok: false,
        code: result.code,
        message: messages[result.code] ?? 'Cannot start session',
      };
    }

    const leaderboard = await getLiveLeaderboard(sessionId);
    emitLiveSessionEvent(sessionId, {
      type: 'session_update',
      payload: { status: 'LIVE', currentPerformerId: result.firstPerformerId },
    });
    emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
    logLiveTransition('admin', sessionId, 'start', { currentPerformerId: result.firstPerformerId });
    return { ok: true };
  } catch (e) {
    console.error('[live-session] performLiveSessionStart failed', sessionId, e);
    return { ok: false, code: 'INTERNAL', message: 'Start failed' };
  }
}

/** End session now: complete current LIVE slot if any, session ENDED, window COMPLETED when linked. */
export async function performLiveSessionEnd(sessionId: string): Promise<SessionEndResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT 1 FROM "LiveChallengeSession" WHERE id = ${sessionId} FOR UPDATE`
      );

      const session = await tx.liveChallengeSession.findUnique({
        where: { id: sessionId },
        include: { slots: { orderBy: { slotOrder: 'asc' } } },
      });

      if (!session) return { type: 'err' as const, code: 'NOT_FOUND' };
      if (session.status !== 'LIVE') {
        return { type: 'err' as const, code: 'INVALID_STATE', detail: { status: session.status } };
      }

      const now = new Date();
      const currentIdx = session.slots.findIndex((s) => s.performerUserId === session.currentPerformerId);

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

      return { type: 'ok' as const };
    });

    if (result.type === 'err') {
      logLiveTransition('admin', sessionId, 'end_blocked', { code: result.code });
      return {
        ok: false,
        code: result.code,
        message:
          result.code === 'INVALID_STATE'
            ? 'Session must be LIVE to end'
            : 'Cannot end session',
      };
    }

    const leaderboard = await getLiveLeaderboard(sessionId);
    emitLiveSessionEvent(sessionId, {
      type: 'session_update',
      payload: { status: 'ENDED', currentPerformerId: null },
    });
    emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
    logLiveTransition('admin', sessionId, 'end', {});
    return { ok: true };
  } catch (e) {
    console.error('[live-session] performLiveSessionEnd failed', sessionId, e);
    return { ok: false, code: 'INTERNAL', message: 'End failed' };
  }
}
