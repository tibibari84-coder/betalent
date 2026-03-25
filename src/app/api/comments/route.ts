/**
 * GET /api/comments?videoId=...
 * Top-level comments only (newest first). Replies: GET /api/comments/[id]/replies.
 * Paginated with cursor. Includes likedByMe when signed in.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkCommentPermission } from '@/lib/comment-service';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function formatTimestamp(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId') ?? searchParams.get('performanceId');
    if (!videoId) {
      return NextResponse.json({ ok: false, message: 'videoId or performanceId required' }, { status: 400 });
    }

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)),
      MAX_LIMIT
    );
    const cursor = searchParams.get('cursor') ?? undefined;

    const video = await prisma.video.findFirst({
      where: { id: videoId },
      select: {
        id: true,
        commentsCount: true,
        creatorId: true,
        commentPermission: true,
        visibility: true,
        status: true,
        processingStatus: true,
        moderationStatus: true,
      },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    const isOwnerOrAdmin = !!user && (user.id === video.creatorId || user.role === 'ADMIN');
    const isPubliclyReadable =
      video.visibility === CANONICAL_PUBLIC_VIDEO_WHERE.visibility &&
      video.status === CANONICAL_PUBLIC_VIDEO_WHERE.status &&
      video.processingStatus === CANONICAL_PUBLIC_VIDEO_WHERE.processingStatus &&
      video.moderationStatus === CANONICAL_PUBLIC_VIDEO_WHERE.moderationStatus;
    if (!isPubliclyReadable && !isOwnerOrAdmin) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    let canComment = false;
    let currentUserId: string | null = null;
    if (user) {
      currentUserId = user.id;
      const perm = await checkCommentPermission(videoId, user.id);
      canComment = perm.allowed;
    }

    const rows = await prisma.comment.findMany({
      where: { videoId, parentId: null },
      orderBy: { createdAt: 'desc' },
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
            select: { commentId: true },
          })
        : [];
    const likedSet = new Set(likeRows.map((l) => l.commentId));

    const isCreatorOrAdmin = user?.role === 'ADMIN';
    const comments = items.map((c) => {
      const u = c.user.creatorVerification;
      const verification = Array.isArray(u) ? u[0] : u ?? undefined;
      const authorId = c.user.id;
      const isCreator = video.creatorId === authorId;
      const canDelete =
        !!currentUserId &&
        (authorId === currentUserId || video.creatorId === currentUserId || isCreatorOrAdmin);
      return {
        id: c.id,
        parentId: c.parentId,
        userId: authorId,
        username: c.user.username,
        avatarUrl: c.user.avatarUrl ?? undefined,
        country: c.user.country ?? undefined,
        timestamp: formatTimestamp(c.createdAt),
        body: c.body,
        isDeleted: c.isDeleted,
        likeCount: c.likeCount,
        replyCount: c.replyCount,
        verified: !!c.user.isVerified,
        verificationLevel: verification?.verificationLevel ?? null,
        isCreator: !!isCreator,
        canDelete,
        createdAt: c.createdAt.toISOString(),
        likedByMe: likedSet.has(c.id),
      };
    });

    return NextResponse.json({
      ok: true,
      comments,
      commentsCount: video.commentsCount,
      commentPermission: video.commentPermission,
      canComment,
      creatorId: video.creatorId,
      currentUserId: currentUserId ?? null,
      nextCursor,
    });
  } catch (e) {
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for comments. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to fetch comments' }, { status: 500 });
  }
}
