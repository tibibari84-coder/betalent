import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChallengeLeaderboard } from '@/services/challenge.service';
import { getFlagEmoji } from '@/lib/countries';
import { getCurrentUser } from '@/lib/auth';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

/**
 * GET /api/challenges/[slug]/leaderboard
 * Query: limit=50
 * Returns ranked entries (creator + video + score, votes, engagement).
 */
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const viewer = await getCurrentUser();
    const { slug } = params;
    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50', 10),
      100
    );

    const entries = await getChallengeLeaderboard(challenge.id, limit, {
      viewerUserId: viewer?.id ?? null,
    });
    const withFlags = entries.map((e) => ({
      ...e,
      countryFlag: e.country ? getFlagEmoji(e.country) : '',
    }));

    return NextResponse.json({
      ok: true,
      slug,
      leaderboard: withFlags,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
