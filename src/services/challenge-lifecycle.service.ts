/**
 * Challenge lifecycle service – status transitions, timestamp-based rules.
 * Enforces the Weekly Global Live Challenge lifecycle backend-side.
 * See: docs/WEEKLY-GLOBAL-LIVE-CHALLENGE.md
 */

import { prisma } from '@/lib/prisma';
import type { ChallengeStatus } from '@prisma/client';

const ENTRY_OPEN = 'ENTRY_OPEN' as const;
const ENTRY_CLOSED = 'ENTRY_CLOSED' as const;
const LIVE_UPCOMING = 'LIVE_UPCOMING' as const;
const LIVE_ACTIVE = 'LIVE_ACTIVE' as const;
const VOTING_CLOSED = 'VOTING_CLOSED' as const;
const WINNERS_LOCKED = 'WINNERS_LOCKED' as const;
const ARCHIVED = 'ARCHIVED' as const;
const SCHEDULED = 'SCHEDULED' as const;
const DRAFT = 'DRAFT' as const;

function ts(now: Date, c: { entryOpenAt?: Date | null; entryCloseAt?: Date | null; votingCloseAt?: Date | null; startAt: Date; endAt: Date }) {
  const entryOpen = c.entryOpenAt ? new Date(c.entryOpenAt) : new Date(c.startAt);
  const entryClose = c.entryCloseAt ? new Date(c.entryCloseAt) : new Date(c.endAt);
  const votingClose = c.votingCloseAt ? new Date(c.votingCloseAt) : new Date(c.endAt);
  return { entryOpen, entryClose, votingClose, now };
}

/** Compute desired status from timestamps. Does not mutate DB. */
export function computeStatusFromTimestamps(
  c: { status: ChallengeStatus; entryOpenAt?: Date | null; entryCloseAt?: Date | null; votingCloseAt?: Date | null; startAt: Date; endAt: Date },
  now: Date = new Date()
): ChallengeStatus {
  const { entryOpen, entryClose, votingClose, now: t } = ts(now, c);
  if (t.getTime() < entryOpen.getTime()) return SCHEDULED;
  if (t.getTime() < entryClose.getTime()) return ENTRY_OPEN;
  if (t.getTime() >= votingClose.getTime()) return VOTING_CLOSED;
  return ENTRY_CLOSED;
}

/** Check if any live window is currently LIVE for this challenge. */
export async function hasActiveLiveWindow(challengeId: string, now: Date = new Date()): Promise<boolean> {
  const win = await prisma.challengeWindow.findFirst({
    where: {
      challengeId,
      status: 'LIVE',
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
  });
  return !!win;
}

/** Check if any live window is upcoming (scheduled, not started). */
export async function hasUpcomingLiveWindow(challengeId: string, now: Date = new Date()): Promise<boolean> {
  const win = await prisma.challengeWindow.findFirst({
    where: {
      challengeId,
      status: 'SCHEDULED',
      startsAt: { gt: now },
    },
  });
  return !!win;
}

/** Determine if challenge should be LIVE_UPCOMING or LIVE_ACTIVE based on windows. */
export async function resolveLivePhase(challengeId: string, now: Date = new Date()): Promise<'LIVE_UPCOMING' | 'LIVE_ACTIVE' | null> {
  if (await hasActiveLiveWindow(challengeId, now)) return 'LIVE_ACTIVE';
  if (await hasUpcomingLiveWindow(challengeId, now)) return 'LIVE_UPCOMING';
  return null;
}

/** Run lifecycle transition for a single challenge. Returns new status or null if no change. */
export async function transitionChallengeLifecycle(
  challengeId: string,
  now: Date = new Date()
): Promise<{ previous: ChallengeStatus; next: ChallengeStatus } | null> {
  const c = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { status: true, entryOpenAt: true, entryCloseAt: true, votingCloseAt: true, startAt: true, endAt: true },
  });
  if (!c) return null;

  const { entryOpen, entryClose, votingClose, now: t } = ts(now, c);
  let next: ChallengeStatus = c.status;

  if (t.getTime() < entryOpen.getTime()) {
    next = SCHEDULED;
  } else if (t.getTime() < entryClose.getTime()) {
    next = ENTRY_OPEN;
  } else if (t.getTime() >= votingClose.getTime()) {
    next = VOTING_CLOSED;
  } else {
    const livePhase = await resolveLivePhase(challengeId, now);
    next = livePhase ?? ENTRY_CLOSED;
  }

  if (next === c.status) return null;

  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: next },
  });
  return { previous: c.status, next };
}

/** Run lifecycle transitions for all non-DRAFT, non-ARCHIVED, non-WINNERS_LOCKED challenges. */
export async function runChallengeLifecycleJob(now: Date = new Date()): Promise<{ updated: number; errors: string[] }> {
  const challenges = await prisma.challenge.findMany({
    where: {
      status: { notIn: [DRAFT, ARCHIVED, WINNERS_LOCKED] },
    },
    select: { id: true },
  });
  const errors: string[] = [];
  let updated = 0;
  for (const ch of challenges) {
    try {
      const result = await transitionChallengeLifecycle(ch.id, now);
      if (result) updated++;
    } catch (e) {
      errors.push(`${ch.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { updated, errors };
}
