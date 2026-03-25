/**
 * Cron endpoint: refresh VideoRankingStats for all READY videos.
 * Use for backfill or periodic refresh so For You / Trending use stored scores.
 * Call with: GET or POST /api/cron/ranking-refresh (Vercel Cron uses GET + Bearer)
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * CRON_SECRET must be set (fail closed if missing).
 */
import { NextResponse } from 'next/server';
import { updateAllRankingStats } from '@/services/ranking.service';
import { cronHandler } from '@/lib/cron-secret';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
/** Vercel route segment: max request duration (seconds). NOT video duration. */
export const maxDuration = 120;

/**
 * Refreshes stored video ranking stats only. Daily tier + stats job is `POST|GET /api/cron/rank-talents`.
 * Use this route for heavier backfill or extra-frequent stat-only refreshes without re-running tier math.
 */
async function execute(_request: Request) {
  try {
    const { updated } = await updateAllRankingStats(100);
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('[cron/ranking-refresh]', e);
    return apiError(500, e instanceof Error ? e.message : 'Ranking refresh failed', { code: 'RANKING_REFRESH_FAILED' });
  }
}

const handle = cronHandler(execute);
export const GET = handle;
export const POST = handle;
