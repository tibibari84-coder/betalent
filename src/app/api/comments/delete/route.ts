// POST – delete comment (deprecated alias).

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { softDeleteCommentOrThrow } from '@/services/comment-delete.service';

const bodySchema = z.object({
  commentId: z.string().min(1, 'commentId required'),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
    }
    const commentId = parsed.data.commentId.trim();
    const result = await softDeleteCommentOrThrow({
      commentId,
      actor: { id: user.id, role: user.role },
    });
    const res = NextResponse.json({ ok: true, commentId: result.commentId, deleted: !result.alreadyDeleted });
    res.headers.set('Deprecation', 'true');
    res.headers.set('Sunset', 'Wed, 01 Oct 2026 00:00:00 GMT');
    res.headers.set('Link', '</api/comment/{id}>; rel="successor-version"');
    return res;
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'COMMENT_NOT_FOUND') {
      return NextResponse.json({ ok: false, message: 'Comment not found' }, { status: 404 });
    }
    if (e instanceof Error && e.message === 'COMMENT_FORBIDDEN') {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: 'Delete failed' }, { status: 500 });
  }
}
