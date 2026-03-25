import { NextResponse } from 'next/server';
import { z } from 'zod';
import { markAnalysisFailed } from '@/services/vocal-scoring.service';

export const dynamic = 'force-dynamic';
const API_KEY = process.env.INTERNAL_AUDIO_ANALYSIS_API_KEY;

const failedSchema = z.object({
  videoId: z.string().min(1, 'videoId required'),
  reason: z.string().optional(),
  retryable: z.boolean().optional(),
  attemptCount: z.number().int().min(0).optional(),
});

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
}

/**
 * POST /api/internal/audio-analysis/failed
 * Body: { videoId, reason?, retryable?, attemptCount? }. Sets lastError, finishedAt; RETRYABLE_FAILED or FAILED by attempt count.
 */
export async function POST(req: Request) {
  if (!API_KEY || API_KEY.length < 8) return NextResponse.json({ ok: false, message: 'Server not configured' }, { status: 503 });
  const key = req.headers.get('x-internal-api-key');
  if (!key || key !== API_KEY) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = failedSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Validation failed', errors: parsed.error.flatten() }, { status: 400 });
  }
  const { videoId, reason, retryable, attemptCount } = parsed.data;

  const { accepted } = await markAnalysisFailed(videoId, reason, { retryable, attemptCount });
  return NextResponse.json({ ok: true, accepted });
}
