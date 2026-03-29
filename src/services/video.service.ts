import type { Prisma, ProfileVisibilityLevel } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE, PRIVATE_VIDEO_OWNER_VIEW_WHERE } from '@/lib/video-moderation';
import { canViewerAccessProfile } from '@/services/profile-access.service';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';

const videoDetailInclude = {
  creator: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      country: true,
      bio: true,
      isVerified: true,
      creatorTier: true,
      profileVisibility: true,
      followersCount: true,
      followingCount: true,
      creatorVerification: {
        where: { verificationStatus: 'APPROVED' as const },
        select: { verificationLevel: true },
      },
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
    include: {
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
    },
  },
} satisfies Prisma.VideoInclude;

/**
 * Public video (canonical gate) OR private READY video when viewer is the creator.
 * Private/hidden performances never appear here for other viewers; gifts/votes/views use the same public gate in services.
 */
export async function getVideoById(id: string, viewerUserId?: string | null) {
  const where: Prisma.VideoWhereInput = {
    id,
    OR: [
      CANONICAL_PUBLIC_VIDEO_WHERE,
      ...(viewerUserId
        ? [{ AND: [{ creatorId: viewerUserId }, PRIVATE_VIDEO_OWNER_VIEW_WHERE] } satisfies Prisma.VideoWhereInput]
        : []),
    ],
  };
  const video = await prisma.video.findFirst({
    where,
    include: videoDetailInclude,
  });
  if (!video) return null;

  const creatorVis = (video.creator as { profileVisibility: ProfileVisibilityLevel }).profileVisibility;
  const canSee = await canViewerAccessProfile({
    creatorId: video.creatorId,
    viewerUserId: viewerUserId ?? null,
    profileVisibility: creatorVis,
  });
  if (!canSee) return null;

  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({ where: { creatorId: video.creatorId } }),
    prisma.follow.count({ where: { followerId: video.creatorId } }),
  ]);

  return {
    ...video,
    creator: {
      ...video.creator,
      followersCount,
      followingCount,
    },
  };
}

export async function incrementViewCount(videoId: string) {
  return prisma.video.updateMany({
    where: { id: videoId, deletedAt: null },
    data: { viewsCount: { increment: 1 } },
  });
}

export async function getVideoUserState(
  videoId: string,
  creatorId: string,
  currentUserId: string | null
): Promise<{ liked: boolean; following: boolean; userVote: number | null }> {
  if (!currentUserId) return { liked: false, following: false, userVote: null };
  const [like, follow, vote] = await Promise.all([
    prisma.like.findUnique({
      where: { userId_videoId: { userId: currentUserId, videoId } },
    }),
    prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId: currentUserId, creatorId } },
    }),
    prisma.vote.findUnique({
      where: { userId_videoId: { userId: currentUserId, videoId } },
      select: { value: true },
    }),
  ]);
  return {
    liked: !!like,
    following: !!follow,
    userVote: vote?.value ?? null,
  };
}

export async function getRelatedVideos(
  categoryId: string,
  excludeVideoId: string,
  limit = 6,
  viewerUserId: string | null = null
) {
  return prisma.video.findMany({
    where: {
      AND: [
        {
          categoryId,
          id: { not: excludeVideoId },
          ...CANONICAL_PUBLIC_VIDEO_WHERE,
        },
        videoDiscoveryVisibilityWhere(viewerUserId),
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      votesCount: true,
      talentScore: true,
      visibility: true,
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
        },
      },
    },
  });
}

/** More performances from the same creator (for modal related section). */
export async function getVideosByCreator(
  creatorId: string,
  excludeVideoId: string,
  limit = 6,
  viewerUserId: string | null = null
) {
  return prisma.video.findMany({
    where: {
      AND: [
        {
          creatorId,
          id: { not: excludeVideoId },
          ...CANONICAL_PUBLIC_VIDEO_WHERE,
        },
        videoDiscoveryVisibilityWhere(viewerUserId),
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      likesCount: true,
      viewsCount: true,
      commentsCount: true,
      creator: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
        },
      },
    },
  });
}
