import { prisma } from '@/lib/prisma';
import { canDeleteComment } from '@/lib/comment-service';

const DELETED_PLACEHOLDER = '[deleted]';

export type DeleteCommentInput = {
  commentId: string;
  actor: { id: string; role?: 'USER' | 'ADMIN' };
};

export async function softDeleteCommentOrThrow(input: DeleteCommentInput): Promise<{
  commentId: string;
  alreadyDeleted: boolean;
}> {
  const { commentId, actor } = input;
  const role: 'USER' | 'ADMIN' = actor.role === 'ADMIN' ? 'ADMIN' : 'USER';

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      videoId: true,
      parentId: true,
      isDeleted: true,
      video: { select: { creatorId: true } },
    },
  });

  if (!comment) {
    const err = new Error('COMMENT_NOT_FOUND');
    throw err;
  }

  if (comment.isDeleted) {
    return { commentId, alreadyDeleted: true };
  }

  const isCreator = comment.video.creatorId === actor.id;
  const isAdmin = role === 'ADMIN';
  const allowed = await canDeleteComment(commentId, actor.id, isCreator || isAdmin);
  if (!allowed) {
    const err = new Error('COMMENT_FORBIDDEN');
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { isDeleted: true, body: DELETED_PLACEHOLDER, editedAt: new Date() },
    });
    await tx.video.updateMany({
      where: { id: comment.videoId, commentsCount: { gt: 0 } },
      data: { commentsCount: { decrement: 1 } },
    });
    if (comment.parentId) {
      await tx.comment.updateMany({
        where: { id: comment.parentId, replyCount: { gt: 0 } },
        data: { replyCount: { decrement: 1 } },
      });
    }
  });

  return { commentId, alreadyDeleted: false };
}

