import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

export const MAX_COMMENT_DEPTH = 2;
export const MAX_BODY_LENGTH = 500;

export type CommentPermissionResult = {
  allowed: boolean;
  reason?: string;
};

/**
 * Check if a user is allowed to comment on a video.
 * Uses video.commentPermission and Follow table for FOLLOWERS/FOLLOWING.
 */
export async function checkCommentPermission(
  videoId: string,
  userId: string
): Promise<CommentPermissionResult> {
  const video = await prisma.video.findFirst({
    where: { id: videoId },
    select: { creatorId: true, commentPermission: true },
  });

  if (!video) {
    return { allowed: false, reason: 'Video not found or not eligible for comments' };
  }

  if (video.commentPermission === 'OFF') {
    return { allowed: false, reason: 'Comments are disabled' };
  }

  /** Creators can comment on their own performances (FOLLOWERS/FOLLOWING do not apply to self). */
  if (video.creatorId === userId) {
    return { allowed: true };
  }

  const publicVideo = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: { id: true },
  });
  if (!publicVideo) {
    return { allowed: false, reason: 'Video not found or not eligible for comments' };
  }

  switch (video.commentPermission) {
    case 'EVERYONE':
      return { allowed: true };

    case 'FOLLOWERS': {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_creatorId: {
            followerId: userId,
            creatorId: video.creatorId,
          },
        },
      });
      if (!follow) {
        return { allowed: false, reason: 'Only followers of the creator can comment' };
      }
      return { allowed: true };
    }

    case 'FOLLOWING': {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_creatorId: {
            followerId: video.creatorId,
            creatorId: userId,
          },
        },
      });
      if (!follow) {
        return { allowed: false, reason: 'Only users the creator follows can comment' };
      }
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: 'Comments are disabled' };
  }
}

/**
 * Check if a user can delete a comment.
 * Author can delete own, creator can delete on own video, or isCreatorOrAdmin.
 */
export async function canDeleteComment(
  commentId: string,
  userId: string,
  isCreatorOrAdmin: boolean
): Promise<boolean> {
  if (isCreatorOrAdmin) {
    return true;
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      userId: true,
      video: { select: { creatorId: true } },
    },
  });

  if (!comment) {
    return false;
  }

  const isAuthor = comment.userId === userId;
  const isVideoCreator = comment.video.creatorId === userId;

  return isAuthor || isVideoCreator;
}
