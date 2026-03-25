import { NextResponse } from 'next/server';
import {
  getTopSupportedCreators,
  getTopSupporters,
  getMostGiftedPerformances,
} from '@/services/support-leaderboard.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { getCurrentUser } from '@/lib/auth';
import { LEADERBOARD_TYPES, LEADERBOARD_PERIODS, type LeaderboardPeriod, type LeaderboardType } from '@/types/leaderboard';

const VALID_TYPES = new Set<LeaderboardType>(Object.values(LEADERBOARD_TYPES));
const VALID_PERIODS = new Set<LeaderboardPeriod>(Object.values(LEADERBOARD_PERIODS));

/**
 * GET /api/leaderboard/support?type=...&period=all_time|weekly&limit=50
 * Returns UI-ready leaderboard rows (creator name, flag, avatar, total support, rank).
 */
export async function GET(req: Request) {
  try {
    const viewer = await getCurrentUser();
    const viewerUserId = viewer?.id ?? null;
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') ?? LEADERBOARD_TYPES.TOP_SUPPORTED_CREATORS) as LeaderboardType;
    const periodParam = (searchParams.get('period') ?? 'all_time') as LeaderboardPeriod;
    const periodVal: LeaderboardPeriod = VALID_PERIODS.has(periodParam) ? periodParam : 'all_time';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid type. Use top_supported_creators | top_supporters | most_gifted_performances' },
        { status: 400 }
      );
    }
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const week = searchParams.get('week') ? Number(searchParams.get('week')) : undefined;
    const options =
      year != null && week != null
        ? { year, week, viewerUserId }
        : { viewerUserId };

    if (type === LEADERBOARD_TYPES.TOP_SUPPORTED_CREATORS) {
      const rows = await getTopSupportedCreators(periodVal, limit, options);
      return NextResponse.json({ ok: true, leaderboard: rows, type, period: periodVal });
    }
    if (type === LEADERBOARD_TYPES.TOP_SUPPORTERS) {
      const rows = await getTopSupporters(periodVal, limit, options);
      return NextResponse.json({ ok: true, leaderboard: rows, type, period: periodVal });
    }
    const rows = await getMostGiftedPerformances(periodVal, limit, options);
    return NextResponse.json({ ok: true, leaderboard: rows, type, period: periodVal });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
