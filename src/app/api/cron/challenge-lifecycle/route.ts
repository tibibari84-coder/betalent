/**
 * Cron: challenge lifecycle transitions + auto-lock winners.
 * GET or POST /api/cron/challenge-lifecycle (Vercel Cron uses GET + Bearer)
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 *
 * 1. Transitions challenge status by timestamps (ENTRY_OPEN, ENTRY_CLOSED, LIVE_*, VOTING_CLOSED).
 * 2. Auto-locks winners for challenges in VOTING_CLOSED where votingCloseAt has passed.
 */
import { NextResponse } from 'next/server';
import { cronHandler } from '@/lib/cron-secret';
import { apiError } from '@/lib/api-error';
import { runChallengeLifecycleJob } from '@/services/challenge-lifecycle.service';
import { lockChallengeWinners } from '@/services/challenge-winner.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
/** Vercel route segment: max request duration (seconds). NOT video duration. */
export const maxDuration = 120;

async function execute(_request: Request) {
  try {
    const now = new Date();
    const lifecycle = await runChallengeLifecycleJob(now);

    const toLock = await prisma.challenge.findMany({
      where: {
        status: 'VOTING_CLOSED',
        OR: [
          { votingCloseAt: { lte: now } },
          { endAt: { lte: now } },
        ],
      },
      select: { id: true },
    });

    let lockedCount = 0;
    const lockErrors: string[] = [];
    for (const c of toLock) {
      const r = await lockChallengeWinners(c.id);
      if (r.ok) lockedCount += r.winnersCount;
      else lockErrors.push(`${c.id}: ${r.code}`);
    }

    return NextResponse.json({
      ok: true,
      lifecycle: { updated: lifecycle.updated, errors: lifecycle.errors },
      winnersLocked: lockedCount,
      lockErrors: lockErrors.length ? lockErrors : undefined,
    });
  } catch (e) {
    console.error('[cron/challenge-lifecycle]', e);
    return apiError(500, e instanceof Error ? e.message : 'Challenge lifecycle failed', { code: 'CHALLENGE_CRON_FAILED' });
  }
}

const handle = cronHandler(execute);
export const GET = handle;
export const POST = handle;
