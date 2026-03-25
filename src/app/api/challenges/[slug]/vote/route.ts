/**
 * POST /api/challenges/[slug]/vote
 * Body: { videoId: string, stars: number }
 * Submit or update a star vote (1–5) for a challenge entry.
 * Requires auth. Self-vote blocked. Rate limited.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getChallengeVoteSummary,
  invalidateChallengeVoteSummaryCache,
  submitChallengeVote,
} from '@/services/challenge-vote.service';

export async function POST(
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

    const body = (await req.json()) as { videoId?: string; stars?: number };
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const stars = typeof body.stars === 'number' ? body.stars : NaN;

    if (!videoId) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_VIDEO_ID' },
        { status: 400 }
      );
    }

    const result = await submitChallengeVote({
      challengeId: challenge.id,
      videoId,
      voterUserId: user.id,
      stars,
    });

    if (result.ok) {
      invalidateChallengeVoteSummaryCache(challenge.id);
    }

    if (!result.ok) {
      const status =
        result.code === 'CHALLENGE_NOT_FOUND' || result.code === 'ENTRY_NOT_FOUND'
          ? 404
          : result.code === 'VOTING_CLOSED'
            ? 410
            : result.code === 'SELF_VOTE' || result.code === 'VOTES_DISABLED'
              ? 403
              : result.code === 'INVALID_STARS'
                ? 400
                : result.code === 'RATE_LIMIT'
                  ? 429
                  : result.code === 'UNAUTHORIZED'
                    ? 401
                    : 400;
      return NextResponse.json(
        { ok: false, code: result.code },
        { status }
      );
    }

    const summary = await getChallengeVoteSummary(challenge.id);
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      summary,
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
