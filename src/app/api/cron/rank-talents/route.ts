/**
 * Cron endpoint: run the talent ranking job daily.
 * Call with: GET or POST /api/cron/rank-talents (Vercel Cron uses GET + Bearer)
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * Set CRON_SECRET in env (e.g. Vercel cron secret). Required — fail closed if missing.
 */
import { NextResponse } from 'next/server';
import { runTalentRankingJob } from '@/services/talent-ranking.service';
import { cronHandler } from '@/lib/cron-secret';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
/** Vercel route segment: max request duration (seconds). NOT video duration. */
export const maxDuration = 60;

async function execute(_request: Request) {
  try {
    const { updated, errors, rankingStatsUpdated } = await runTalentRankingJob();
    return NextResponse.json({
      ok: true,
      updated,
      rankingStatsUpdated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error('[cron/rank-talents]', e);
    return apiError(500, e instanceof Error ? e.message : 'Ranking job failed', { code: 'RANK_JOB_FAILED' });
  }
}

const handle = cronHandler(execute);
export const GET = handle;
export const POST = handle;
