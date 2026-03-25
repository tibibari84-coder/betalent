import { NextResponse } from 'next/server';
import { z } from 'zod';
import { saveAnalysisResult } from '@/services/vocal-scoring.service';
import { ANALYSIS_VERSION } from '@/constants/audio-analysis';

export const dynamic = 'force-dynamic';
const API_KEY = process.env.INTERNAL_AUDIO_ANALYSIS_API_KEY;

const resultSchema = z.object({
  videoId: z.string().min(1, 'videoId required'),
  pitchAccuracyScore: z.coerce.number().min(0).max(100),
  rhythmTimingScore: z.coerce.number().min(0).max(100),
  toneStabilityScore: z.coerce.number().min(0).max(100),
  clarityScore: z.coerce.number().min(0).max(100),
  dynamicControlScore: z.coerce.number().min(0).max(100),
  performanceConfidenceScore: z.coerce.number().min(0).max(100),
  analysisVersion: z.string().max(64).optional(),
  flagReason: z.string().max(128).optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
}

/**
 * POST /api/internal/audio-analysis/result
 * Body: { videoId, sub-scores 0–100, optional analysisVersion, flagReason, rawPayload }.
 * Idempotent: no-op when job already COMPLETED or FLAGGED (returns accepted: true, reason: 'IDEMPOTENT_SKIP').
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
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Validation failed', errors: parsed.error.flatten() }, { status: 400 });
  }
  const { videoId, analysisVersion, flagReason, rawPayload, ...subScores } = parsed.data;

  const { accepted, reason } = await saveAnalysisResult(videoId, subScores, {
    analysisVersion: analysisVersion ?? ANALYSIS_VERSION,
    flagReason: flagReason ?? undefined,
    rawPayload: rawPayload ?? undefined,
  });
  return NextResponse.json({ ok: true, accepted, reason });
}
