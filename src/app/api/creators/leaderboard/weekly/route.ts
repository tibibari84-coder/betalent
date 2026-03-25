import { NextResponse } from 'next/server';
import { getWeeklySupportLeaderboard } from '@/services/creator-monetization.service';
import { getISOWeek } from '@/lib/date-utils';

/**
 * GET /api/creators/leaderboard/weekly
 * Query: ?year=2025&week=12 (optional; defaults to current ISO week)
 * Returns top creators by support for that week. Ready for leaderboard UI.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const weekParam = searchParams.get('week');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const { year, week } =
      yearParam != null && weekParam != null
        ? { year: Number(yearParam), week: Number(weekParam) }
        : getISOWeek(new Date());

    if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
      return NextResponse.json(
        { ok: false, message: 'Invalid year or week' },
        { status: 400 }
      );
    }

    const leaderboard = await getWeeklySupportLeaderboard(year, week, limit);
    return NextResponse.json({
      ok: true,
      year,
      week,
      leaderboard,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
