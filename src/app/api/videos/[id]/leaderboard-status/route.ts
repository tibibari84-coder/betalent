/**
 * GET /api/videos/[id]/leaderboard-status
 * Returns video's rank in performance leaderboard if available.
 * Query: period=weekly|monthly|all_time (default: weekly), scope=global|country, countryCode=XX (if scope=country)
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPerformanceLeaderboard } from '@/services/performance-leaderboard.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import type { LeaderboardPeriod, LeaderboardScope } from '@/constants/leaderboard-global';

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'all_time'] as const;
const VALID_SCOPES = ['global', 'country'] as const;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const viewer = await getCurrentUser();
    const { id: videoId } = params;
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get('period') ?? 'weekly') as LeaderboardPeriod;
    const period = VALID_PERIODS.includes(periodParam) ? periodParam : 'weekly';
    const scope = (searchParams.get('scope') ?? 'global') as LeaderboardScope;
    const countryCode =
      scope === 'country'
        ? searchParams.get('countryCode')?.trim().toUpperCase() ?? null
        : null;

    const result = await getPerformanceLeaderboard({
      period,
      countryCode: scope === 'country' ? countryCode : null,
      limit: 100,
      viewerUserId: viewer?.id ?? null,
    });

    const entry = result.entries.find((e) => e.videoId === videoId);

    return NextResponse.json({
      ok: true,
      period,
      scope,
      countryCode: result.countryCode,
      rank: entry?.rank ?? null,
    });
  } catch (e) {
    console.error('[videos/leaderboard-status]', e);
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
