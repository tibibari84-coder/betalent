/**
 * Follow graph — single implementation for all HTTP entry points.
 * Prevents follower/following counter drift from divergent route logic.
 */

import { prisma } from '@/lib/prisma';

export type FollowStateResult = {
  following: boolean;
  followersCount: number;
};

/**
 * Idempotent follow: creates row + increments counts, or no-op if already following.
 * Caller must ensure followerId !== creatorId.
 */
export async function followCreatorOrNoOp(
  followerId: string,
  creatorId: string
): Promise<FollowStateResult> {
  const existing = await prisma.follow.findUnique({
    where: { followerId_creatorId: { followerId, creatorId } },
  });

  if (existing) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { followersCount: true },
    });
    return { following: true, followersCount: creator?.followersCount ?? 0 };
  }

  await prisma.$transaction([
    prisma.follow.create({
      data: { followerId, creatorId, source: 'ORGANIC' },
    }),
    prisma.user.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: creatorId },
      data: { followersCount: { increment: 1 } },
    }),
  ]);

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { followersCount: true },
  });
  return { following: true, followersCount: creator?.followersCount ?? 0 };
}

/**
 * Idempotent unfollow: removes row + decrements counts, or no-op if not following.
 * Caller must ensure followerId !== creatorId.
 */
export async function unfollowCreatorOrNoOp(
  followerId: string,
  creatorId: string
): Promise<FollowStateResult> {
  const existing = await prisma.follow.findUnique({
    where: { followerId_creatorId: { followerId, creatorId } },
  });

  if (!existing) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { followersCount: true },
    });
    return { following: false, followersCount: creator?.followersCount ?? 0 };
  }

  await prisma.$transaction([
    prisma.follow.delete({ where: { id: existing.id } }),
    prisma.user.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    }),
    prisma.user.update({
      where: { id: creatorId },
      data: { followersCount: { decrement: 1 } },
    }),
  ]);

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { followersCount: true },
  });
  return { following: false, followersCount: creator?.followersCount ?? 0 };
}

/**
 * Toggle follow state. Uses the same transactions as follow/unfollow helpers.
 * Caller must ensure followerId !== creatorId.
 */
export async function toggleFollowCreator(
  followerId: string,
  creatorId: string
): Promise<FollowStateResult> {
  const existing = await prisma.follow.findUnique({
    where: { followerId_creatorId: { followerId, creatorId } },
  });
  if (existing) {
    return unfollowCreatorOrNoOp(followerId, creatorId);
  }
  return followCreatorOrNoOp(followerId, creatorId);
}
