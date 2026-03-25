/**
 * GET /api/challenges/[slug]/votes/my-votes
 * Returns current user's votes for all entries in the challenge.
 * Requires auth. Returns map of videoId -> stars.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await requireAuth();
    const { slug } = params;
    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const votes = await prisma.challengeVote.findMany({
      where: { challengeId: challenge.id, voterUserId: user.id },
      select: { videoId: true, stars: true },
    });

    const byVideo = Object.fromEntries(votes.map((v) => [v.videoId, v.stars]));
    return NextResponse.json({
      ok: true,
      votes: byVideo,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
