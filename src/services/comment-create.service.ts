/**
 * Single implementation for creating comments/replies on a video.
 * HTTP: POST /api/comment only (legacy POST /api/comments/create rewrites here).
 */

import { prisma } from '@/lib/prisma';
import {
  checkCommentPermission,
  MAX_BODY_LENGTH,
  MAX_COMMENT_DEPTH,
} from '@/lib/comment-service';
import { extractMentionUsernames } from '@/lib/comment-mentions';
import type { Prisma } from '@prisma/client';

const commentCreateInclude = {
  user: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      country: true,
      isVerified: true,
      creatorVerification: {
        where: { verificationStatus: 'APPROVED' as const },
        select: { verificationLevel: true },
      },
    },
  },
} satisfies Prisma.CommentInclude;

export type CommentApiPayload = {
  id: string;
  body: string;
  isDeleted: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    verified: boolean;
    verificationLevel: string | null;
  };
};

function mapRowToPayload(created: {
  id: string;
  body: string;
  isDeleted: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    isVerified: boolean;
    creatorVerification?:
      | { verificationLevel: string | null }[]
      | { verificationLevel: string | null }
      | null;
  };
}): CommentApiPayload {
  const u = created.user as { creatorVerification?: { verificationLevel: string | null } | null };
  const verification = Array.isArray(
    (created.user as { creatorVerification?: unknown }).creatorVerification
  )
    ? (created.user as { creatorVerification?: { verificationLevel: string | null }[] }).creatorVerification?.[0]
    : u?.creatorVerification;
  return {
    id: created.id,
    body: created.body,
    isDeleted: created.isDeleted,
    likeCount: created.likeCount,
    replyCount: created.replyCount,
    createdAt: created.createdAt.toISOString(),
    user: {
      username: created.user.username,
      displayName: created.user.displayName,
      avatarUrl: created.user.avatarUrl,
      country: created.user.country,
      verified: !!created.user.isVerified,
      verificationLevel: verification?.verificationLevel ?? null,
    },
  };
}

export type CreateCommentServiceResult =
  | { ok: true; comment: CommentApiPayload }
  | { ok: false; status: number; message: string };

/**
 * Creates a top-level comment or a single-level reply (same rules as POST /api/comment).
 */
export async function createCommentOnVideo(params: {
  userId: string;
  videoId: string;
  body: string;
  parentId?: string | null;
}): Promise<CreateCommentServiceResult> {
  const commentBody = params.body.trim();
  if (!commentBody) {
    return { ok: false, status: 400, message: 'Comment cannot be empty' };
  }
  if (commentBody.length > MAX_BODY_LENGTH) {
    return { ok: false, status: 400, message: `Comment must be at most ${MAX_BODY_LENGTH} characters` };
  }

  const { videoId, userId } = params;

  const perm = await checkCommentPermission(videoId, userId);
  if (!perm.allowed) {
    return {
      ok: false,
      status: 403,
      message: perm.reason ?? 'Comments are disabled',
    };
  }

  let parentCommentId: string | null = null;
  if (params.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: params.parentId, videoId, isDeleted: false },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      return { ok: false, status: 404, message: 'Parent comment not found' };
    }
    if (parent.parentId !== null) {
      return {
        ok: false,
        status: 400,
        message: `Replies can only be added to top-level comments (max depth ${MAX_COMMENT_DEPTH})`,
      };
    }
    parentCommentId = parent.id;
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        userId,
        videoId,
        body: commentBody,
        parentId: parentCommentId,
      },
      include: commentCreateInclude,
    });
    await tx.video.update({
      where: { id: videoId },
      data: { commentsCount: { increment: 1 } },
    });
    if (parentCommentId) {
      await tx.comment.update({
        where: { id: parentCommentId },
        data: { replyCount: { increment: 1 } },
      });
    }

    const mentionNames = extractMentionUsernames(commentBody);
    if (mentionNames.length > 0) {
      const users = await tx.user.findMany({
        where: {
          username: { in: mentionNames, mode: 'insensitive' },
          NOT: { id: userId },
        },
        select: { id: true },
      });
      for (const mu of users) {
        await tx.commentMention
          .create({
            data: { commentId: c.id, userId: mu.id },
          })
          .catch(() => {});
      }
    }

    return c;
  });

  return { ok: true, comment: mapRowToPayload(created) };
}
