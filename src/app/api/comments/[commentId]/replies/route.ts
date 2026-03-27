/**
 * GET /api/comments/[commentId]/replies?cursor=&limit=
 * Paginated replies for a top-level comment (oldest first).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { reactionSummariesForCommentIds } from '@/lib/comment-reaction-summary';
import type { CommentReactionType } from '@prisma/client';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 40;

function serializeReactionSummary(s: Partial<Record<CommentReactionType, number>>): Record<string, number> {
  const o: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === 'number' && v > 0) o[k] = v;
  }
  return o;
}

function formatTimestamp(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)),
      MAX_LIMIT
    );
    const cursor = searchParams.get('cursor') ?? undefined;

    const parent = await prisma.comment.findFirst({
      where: { id: commentId, parentId: null },
      select: { id: true, videoId: true },
    });

    if (!parent) {
      return NextResponse.json({ ok: false, message: 'Comment not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    const video = await prisma.video.findFirst({
      where: { id: parent.videoId },
      select: {
        creatorId: true,
        visibility: true,
        status: true,
        processingStatus: true,
        moderationStatus: true,
      },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const isOwnerOrAdmin = !!user && (user.id === video.creatorId || user.role === 'ADMIN');
    const isPubliclyReadable =
      video.visibility === CANONICAL_PUBLIC_VIDEO_WHERE.visibility &&
      video.status === CANONICAL_PUBLIC_VIDEO_WHERE.status &&
      video.processingStatus === CANONICAL_PUBLIC_VIDEO_WHERE.processingStatus &&
      video.moderationStatus === CANONICAL_PUBLIC_VIDEO_WHERE.moderationStatus;
    if (!isPubliclyReadable && !isOwnerOrAdmin) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const currentUserId = user?.id ?? null;

    const rows = await prisma.comment.findMany({
      where: { parentId: commentId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            isVerified: true,
            creatorVerification: {
              where: { verificationStatus: 'APPROVED' },
              select: { verificationLevel: true },
            },
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const ids = items.map((c) => c.id);
    const likeRows =
      currentUserId && ids.length
        ? await prisma.commentLike.findMany({
            where: { userId: currentUserId, commentId: { in: ids } },
            select: { commentId: true, reaction: true },
          })
        : [];
    const myReactionByComment = new Map(likeRows.map((l) => [l.commentId, l.reaction]));
    const summaries = await reactionSummariesForCommentIds(ids);

    const isCreatorOrAdmin = user?.role === 'ADMIN';
    const replies = items.map((c) => {
      const u = c.user.creatorVerification;
      const verification = Array.isArray(u) ? u[0] : u ?? undefined;
      const authorId = c.user.id;
      const isCreatorComment = video.creatorId === authorId;
      const canDelete =
        !!currentUserId &&
        (authorId === currentUserId || video.creatorId === currentUserId || isCreatorOrAdmin);
      const myR = myReactionByComment.get(c.id);
      return {
        id: c.id,
        parentId: c.parentId,
        userId: authorId,
        username: c.user.username,
        displayName: c.user.displayName ?? c.user.username,
        avatarUrl: c.user.avatarUrl ?? undefined,
        country: c.user.country ?? undefined,
        timestamp: formatTimestamp(c.createdAt),
        body: c.body,
        isDeleted: c.isDeleted,
        likeCount: c.likeCount,
        replyCount: 0,
        verified: !!c.user.isVerified,
        verificationLevel: verification?.verificationLevel ?? null,
        isCreator: !!isCreatorComment,
        canDelete,
        createdAt: c.createdAt.toISOString(),
        likedByMe: myReactionByComment.has(c.id),
        myReaction: myR ?? null,
        reactionSummary: serializeReactionSummary(summaries.get(c.id) ?? {}),
      };
    });

    return NextResponse.json({ ok: true, replies, nextCursor });
  } catch (e) {
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for replies. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to load replies' }, { status: 500 });
  }
}
