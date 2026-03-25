/**
 * POST /api/comments/[commentId]/like
 * Toggle like on a comment. Auth required.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isSchemaDriftError } from '@/lib/runtime-config';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { commentId } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true, likeCount: true },
    });
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ ok: false, message: 'Comment not found' }, { status: 404 });
    }

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId: user.id, commentId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.commentLike.delete({ where: { id: existing.id } }),
        prisma.comment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likeCount: true },
      });
      return NextResponse.json({
        ok: true,
        liked: false,
        likeCount: Math.max(0, updated?.likeCount ?? 0),
      });
    }

    await prisma.$transaction([
      prisma.commentLike.create({
        data: { userId: user.id, commentId },
      }),
      prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });
    return NextResponse.json({
      ok: true,
      liked: true,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for comment likes. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to update like' }, { status: 500 });
  }
}
