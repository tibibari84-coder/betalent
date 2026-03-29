/**
 * POST /api/comment
 * Create a comment or reply on a performance (video).
 * Auth required. Permission checked (EVERYONE/FOLLOWERS/FOLLOWING/OFF).
 * Max depth 2 (top-level + one reply level).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MAX_BODY_LENGTH } from '@/lib/comment-service';
import { createCommentOnVideo } from '@/services/comment-create.service';
import { z } from 'zod';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { logger } from '@/lib/logger';
import { logOpsEvent } from '@/lib/ops-events';
import { checkRateLimit } from '@/lib/rate-limit';
import { stripUnsafeTextControls } from '@/lib/security/sanitize';
import { RATE_LIMIT_COMMENT_POST_PER_USER_PER_HOUR } from '@/constants/api-rate-limits';

const bodySchema = z.object({
  videoId: z.string().cuid(),
  body: z.string().min(1, 'Comment cannot be empty').max(MAX_BODY_LENGTH),
  parentId: z.string().cuid().optional().nullable(),
});

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    const user = await requireAuth();
    if (
      !(await checkRateLimit(
        'comment-post-user',
        user.id,
        RATE_LIMIT_COMMENT_POST_PER_USER_PER_HOUR,
        60 * 60 * 1000
      ))
    ) {
      return NextResponse.json(
        { ok: false, message: 'Too many comments. Please try again later.' },
        { status: 429 }
      );
    }
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    const commentBody = stripUnsafeTextControls(parsed.body).trim();
    const { videoId, parentId } = parsed;

    if (!commentBody) {
      return NextResponse.json({ ok: false, message: 'Comment cannot be empty' }, { status: 400 });
    }

    const result = await createCommentOnVideo({
      userId: user.id,
      videoId,
      body: commentBody,
      parentId: parentId ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    logOpsEvent('comment_created', {
      userId: user.id,
      videoId,
      commentId: result.comment.id,
      parentId: parentId ?? null,
      latencyMs: Math.round(performance.now() - startedAt),
    });
    return NextResponse.json({ ok: true, comment: result.comment });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body (videoId, body 1–500)', errors: e.flatten() },
        { status: 400 }
      );
    }
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for comments. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    logger.error('comment_route_unhandled', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, message: 'Comment failed', code: 'COMMENT_FAILED' }, { status: 500 });
  }
}
