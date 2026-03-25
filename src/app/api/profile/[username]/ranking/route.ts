/**
 * GET /api/profile/[username]/ranking
 * Returns creator's leaderboard rank (global and country) if available.
 * Query: period=weekly|monthly|all_time (default: weekly)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorLeaderboard } from '@/services/creator-leaderboard.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import type { LeaderboardPeriod } from '@/constants/leaderboard-global';

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'all_time'] as const;

function toCreatorType(p: string): 'daily' | 'weekly' | 'monthly' | 'alltime' {
  if (p === 'all_time') return 'alltime';
  return p as 'daily' | 'weekly' | 'monthly';
}

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const viewer = await getCurrentUser();
    const { username } = params;
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get('period') ?? 'weekly') as LeaderboardPeriod;
    const period = VALID_PERIODS.includes(periodParam) ? periodParam : 'weekly';

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, country: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const [globalResult, countryResult] = await Promise.all([
      getCreatorLeaderboard({
        type: toCreatorType(period),
        countryCode: null,
        limit: 100,
        viewerUserId: viewer?.id ?? null,
      }),
      user.country
        ? getCreatorLeaderboard({
            type: toCreatorType(period),
            countryCode: user.country.trim().toUpperCase(),
            limit: 100,
            viewerUserId: viewer?.id ?? null,
          })
        : { entries: [] },
    ]);

    const globalEntry = globalResult.entries.find((e) => e.creatorId === user.id);
    const countryEntry = countryResult.entries.find((e) => e.creatorId === user.id);

    return NextResponse.json({
      ok: true,
      period,
      globalRank: globalEntry?.rank ?? null,
      countryRank: countryEntry?.rank ?? null,
      countryCode: user.country ?? null,
    });
  } catch (e) {
    console.error('[profile/ranking]', e);
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
