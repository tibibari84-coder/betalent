/**
 * POST /api/videos/[id]/vote
 * Deprecated compatibility alias for /api/vote.
 * Submit or update a talent vote (1–10) for the performance.
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  RATE_LIMIT_TALENT_VOTE_PER_IP_PER_HOUR,
  RATE_LIMIT_TALENT_VOTE_PER_USER_PER_HOUR,
} from '@/constants/api-rate-limits';
import { z } from 'zod';
import { submitTalentVote } from '@/services/video-vote.service';

const bodySchema = z.object({
  value: z.number().int().min(1).max(10),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const ip = getClientIp(req);
    if (
      !(await checkRateLimit('video-vote-ip', ip, RATE_LIMIT_TALENT_VOTE_PER_IP_PER_HOUR, 60 * 60 * 1000)) ||
      !(await checkRateLimit('video-vote-user', user.id, RATE_LIMIT_TALENT_VOTE_PER_USER_PER_HOUR, 60 * 60 * 1000))
    ) {
      return apiError(429, 'Too many votes. Please try again later.', { code: 'RATE_LIMIT_VOTE' });
    }
    const videoId = params.id;
    const body = await req.json();
    const { value } = bodySchema.parse(body);

    const result = await submitTalentVote({
      userId: user.id,
      videoId,
      value,
    });
    if (!result.ok) {
      if (result.code === 'VOTES_DISABLED') {
        return apiError(403, 'This creator has turned off talent votes on performances', { code: result.code });
      }
      return apiError(404, 'Video not found', { code: 'VIDEO_NOT_FOUND' });
    }
    return NextResponse.json({
      ok: true,
      userVote: result.userVote,
      votesCount: result.votesCount,
      talentScore: result.talentScore,
      deprecated: true,
      canonicalEndpoint: '/api/vote',
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return apiError(401, 'Login required', { code: 'UNAUTHORIZED' });
    }
    if (e instanceof z.ZodError) {
      return apiError(400, 'Invalid value (1–10)', { code: 'VALIDATION_ERROR', errors: e.errors });
    }
    return apiError(500, 'Vote failed', { code: 'VOTE_FAILED' });
  }
}
