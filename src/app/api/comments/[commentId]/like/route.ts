/**
 * POST /api/comments/[commentId]/like
 * - No JSON body (or empty): quick heart — toggle any reaction off, or add LIKE if none.
 * - JSON { "reaction": "LOVE" | ... }: set/replace reaction; same as current removes (toggle off).
 */

import { NextResponse } from 'next/server';
import type { CommentReactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { reactionSummaryForSingleComment } from '@/lib/comment-reaction-summary';
import { isCommentReactionType } from '@/constants/comment-reactions';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMIT_COMMENT_REACTION_PER_USER_PER_HOUR } from '@/constants/api-rate-limits';
import { z } from 'zod';

const commentIdParamSchema = z.string().cuid();

function serializeSummary(s: Record<string, number>): Record<string, number> {
  const o: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === 'number' && v > 0) o[k] = v;
  }
  return o;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireAuth();
    if (!(await checkRateLimit('comment-reaction-user', user.id, RATE_LIMIT_COMMENT_REACTION_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json(
        { ok: false, message: 'Too many reactions. Please try again later.' },
        { status: 429 }
      );
    }
    const rawId = (await params).commentId;
    const commentIdParsed = commentIdParamSchema.safeParse(rawId);
    if (!commentIdParsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid comment' }, { status: 400 });
    }
    const commentId = commentIdParsed.data;

    let body: { reaction?: unknown } = {};
    try {
      const ct = req.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const t = await req.text();
        if (t.trim()) body = JSON.parse(t) as { reaction?: unknown };
      }
    } catch {
      body = {};
    }

    const requested =
      typeof body.reaction === 'string' && isCommentReactionType(body.reaction)
        ? (body.reaction as CommentReactionType)
        : undefined;

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

    /** Quick heart (no reaction field): remove any reaction, or add LIKE. */
    if (requested === undefined) {
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
        const summaryRaw = await reactionSummaryForSingleComment(commentId);
        return NextResponse.json({
          ok: true,
          liked: false,
          likeCount: Math.max(0, updated?.likeCount ?? 0),
          myReaction: null,
          reactionSummary: serializeSummary(summaryRaw as Record<string, number>),
        });
      }

      await prisma.$transaction([
        prisma.commentLike.create({
          data: { userId: user.id, commentId, reaction: 'LIKE' },
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
      const summaryRaw = await reactionSummaryForSingleComment(commentId);
      return NextResponse.json({
        ok: true,
        liked: true,
        likeCount: updated?.likeCount ?? 0,
        myReaction: 'LIKE',
        reactionSummary: serializeSummary(summaryRaw as Record<string, number>),
      });
    }

    /** Picker: set or change reaction; same reaction again = remove. */
    if (existing) {
      if (existing.reaction === requested) {
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
        const summaryRaw = await reactionSummaryForSingleComment(commentId);
        return NextResponse.json({
          ok: true,
          liked: false,
          likeCount: Math.max(0, updated?.likeCount ?? 0),
          myReaction: null,
          reactionSummary: serializeSummary(summaryRaw as Record<string, number>),
        });
      }

      await prisma.commentLike.update({
        where: { id: existing.id },
        data: { reaction: requested },
      });
      const updated = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likeCount: true },
      });
      const summaryRaw = await reactionSummaryForSingleComment(commentId);
      return NextResponse.json({
        ok: true,
        liked: true,
        likeCount: updated?.likeCount ?? 0,
        myReaction: requested,
        reactionSummary: serializeSummary(summaryRaw as Record<string, number>),
      });
    }

    await prisma.$transaction([
      prisma.commentLike.create({
        data: { userId: user.id, commentId, reaction: requested },
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
    const summaryRaw = await reactionSummaryForSingleComment(commentId);
    return NextResponse.json({
      ok: true,
      liked: true,
      likeCount: updated?.likeCount ?? 0,
      myReaction: requested,
      reactionSummary: serializeSummary(summaryRaw as Record<string, number>),
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
