/**
 * DELETE /api/comment/[id]
 * Soft-delete a comment. Author or video creator can delete.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { softDeleteCommentOrThrow } from '@/services/comment-delete.service';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: commentId } = await params;
    const result = await softDeleteCommentOrThrow({
      commentId,
      actor: { id: user.id, role: user.role },
    });
    return NextResponse.json({ ok: true, commentId: result.commentId, alreadyDeleted: result.alreadyDeleted });
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
