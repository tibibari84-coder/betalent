/**
 * /api/live/challenges/[slug]/session
 * GET: Read-only fetch of existing live session state.
 * POST: Admin-only creation of a new session when explicitly requested.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

async function findChallengeWithEntries(slug: string) {
  return prisma.challenge.findUnique({
    where: { slug },
    include: {
      entries: {
        where: { status: 'ACTIVE', video: CANONICAL_PUBLIC_VIDEO_WHERE },
        select: { creatorId: true, videoId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

async function getLatestSession(challengeId: string) {
  return prisma.liveChallengeSession.findFirst({
    where: { challengeId },
    orderBy: { createdAt: 'desc' },
    include: {
      slots: { orderBy: { slotOrder: 'asc' } },
    },
  });
}

async function createSessionFromChallenge(challenge: {
  id: string;
  entries: Array<{ creatorId: string; videoId: string | null }>;
}) {
  return prisma.liveChallengeSession.create({
    data: {
      challengeId: challenge.id,
      status: 'SCHEDULED',
      slots: {
        create: challenge.entries.slice(0, 12).map((e, i) => ({
          performerUserId: e.creatorId,
          videoId: e.videoId,
          slotOrder: i,
          status: 'WAITING',
        })),
      },
    },
    include: {
      slots: { orderBy: { slotOrder: 'asc' } },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const challenge = await findChallengeWithEntries(slug);

  if (!challenge) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const session = await getLatestSession(challenge.id);

  return NextResponse.json({
    ok: true,
    sessionId: session?.id ?? null,
    status: session?.status ?? null,
    slotsCount: session?.slots.length ?? 0,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await requireAdmin();
    const slug = params.slug?.trim();
    if (!slug) {
      return NextResponse.json({ ok: false, message: 'Invalid challenge slug' }, { status: 400 });
    }

    const challenge = await findChallengeWithEntries(slug);
    if (!challenge) {
      return NextResponse.json({ ok: false, message: 'Challenge not found' }, { status: 404 });
    }

    const existing = await getLatestSession(challenge.id);
    if (existing) {
      return NextResponse.json({
        ok: true,
        created: false,
        sessionId: existing.id,
        status: existing.status,
        slotsCount: existing.slots.length,
      });
    }

    const created = await createSessionFromChallenge(challenge);

    return NextResponse.json({
      ok: true,
      created: true,
      sessionId: created.id,
      status: created.status,
      slotsCount: created.slots.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to create live session' }, { status: 500 });
  }
}

