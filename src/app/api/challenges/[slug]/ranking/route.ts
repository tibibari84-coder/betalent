import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChallengeLeaderboard } from '@/services/challenge.service';
import { getFlagEmoji } from '@/lib/countries';
import { getCurrentUser } from '@/lib/auth';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';

const ROUTE_KEY = 'GET /api/challenges/[slug]/ranking';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const startedAt = performance.now();
  try {
    const viewer = await getCurrentUser();
    const slug = params.slug?.trim();
    if (!slug) {
      return stampApiResponse(
        NextResponse.json({ ok: false, code: 'INVALID_SLUG' }, { status: 400 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) {
      return stampApiResponse(
        NextResponse.json({ ok: false, code: 'CHALLENGE_NOT_FOUND' }, { status: 404 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);
    const leaderboard = await getChallengeLeaderboard(challenge.id, limit, {
      viewerUserId: viewer?.id ?? null,
    });

    return stampApiResponse(
      NextResponse.json({
        ok: true,
        ranking: leaderboard.map((e) => ({
          ...e,
          countryFlag: e.country ? getFlagEmoji(e.country) : '',
        })),
      }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json(
          { ok: false, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
          { status: 503 }
        ),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  }
}
