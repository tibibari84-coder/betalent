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

const bodySchema = z.object({
  videoId: z.string().min(1, 'videoId required'),
  body: z.string().min(1, 'Comment cannot be empty').max(MAX_BODY_LENGTH),
  parentId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    const commentBody = parsed.body.trim();
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
    return NextResponse.json({ ok: false, message: 'Comment failed' }, { status: 500 });
  }
}
