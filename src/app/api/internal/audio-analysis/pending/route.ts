import { NextResponse } from 'next/server';
import { claimNextPendingJob } from '@/services/vocal-scoring.service';

export const dynamic = 'force-dynamic';
const API_KEY = process.env.INTERNAL_AUDIO_ANALYSIS_API_KEY;

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
}

/**
 * GET /api/internal/audio-analysis/pending
 * Atomically claims next PENDING or retryable job; returns only if URL is allowlisted and duration within limit.
 * Header: x-internal-api-key = INTERNAL_AUDIO_ANALYSIS_API_KEY (required; query apiKey is deprecated).
 */
export async function GET(req: Request) {
  if (!API_KEY || API_KEY.length < 8) {
    return NextResponse.json({ ok: false, message: 'Server not configured' }, { status: 503 });
  }
  const key = req.headers.get('x-internal-api-key');
  if (!key || key !== API_KEY) return unauthorized();

  const job = await claimNextPendingJob();
  if (!job) return new NextResponse(null, { status: 204 });
  return NextResponse.json({
    ok: true,
    videoId: job.videoId,
    videoUrl: job.videoUrl,
    styleCategoryId: job.styleCategoryId,
    attemptCount: job.attemptCount,
  });
}
