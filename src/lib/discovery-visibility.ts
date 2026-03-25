import type { Prisma, ProfileVisibilityLevel } from '@prisma/client';

/**
 * Single backend truth for “may this viewer see this creator in public discovery?”
 * (search, explore, feeds, leaderboards, related lists, global map, etc.)
 */
export function creatorDiscoverableToViewer(params: {
  profileVisibility: ProfileVisibilityLevel;
  creatorId: string;
  viewerUserId: string | null | undefined;
  /** Whether viewer follows creator; only consulted for FOLLOWERS_ONLY. */
  viewerFollowsCreator: boolean;
}): boolean {
  const { profileVisibility, creatorId, viewerUserId, viewerFollowsCreator } = params;
  if (profileVisibility === 'PUBLIC') return true;
  if (!viewerUserId) return false;
  if (creatorId === viewerUserId) return true;
  if (profileVisibility === 'PRIVATE') return false;
  return viewerFollowsCreator;
}

/** Prisma fragment for User rows in search / country lists. */
export function userDiscoveryVisibilityWhere(
  viewerUserId: string | null | undefined
): Prisma.UserWhereInput {
  if (!viewerUserId) {
    return { profileVisibility: 'PUBLIC' };
  }
  return {
    OR: [
      { profileVisibility: 'PUBLIC' },
      { id: viewerUserId },
      {
        AND: [
          { profileVisibility: 'FOLLOWERS_ONLY' },
          { followers: { some: { followerId: viewerUserId } } },
        ],
      },
    ],
  };
}

/** Prisma fragment for Video rows in discovery (merge with AND). */
export function videoDiscoveryVisibilityWhere(
  viewerUserId: string | null | undefined
): Prisma.VideoWhereInput {
  if (!viewerUserId) {
    return { creator: { profileVisibility: 'PUBLIC' } };
  }
  return {
    OR: [
      { creator: { profileVisibility: 'PUBLIC' } },
      { creatorId: viewerUserId },
      {
        AND: [
          { creator: { profileVisibility: 'FOLLOWERS_ONLY' } },
          { creator: { followers: { some: { followerId: viewerUserId } } } },
        ],
      },
    ],
  };
}
