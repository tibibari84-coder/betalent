import { prisma } from '@/lib/prisma';
import { getVideoProcessingLabel } from '@/lib/upload-status';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

export async function getProfileByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      country: true,
      city: true,
      talentType: true,
      creatorTier: true,
      isVerified: true,
      followersCount: true,
      followingCount: true,
      videosCount: true,
      totalViews: true,
      totalLikes: true,
      totalVotes: true,
      totalCoinsReceived: true,
      createdAt: true,
      profileVisibility: true,
      creatorVerification: {
        where: { verificationStatus: 'APPROVED' },
        select: { verificationLevel: true },
      },
    },
  });
  if (!user) return null;
  const { creatorVerification, ...rest } = user;
  return {
    ...rest,
    verificationLevel: creatorVerification?.verificationLevel ?? null,
  };
}

/**
 * Returns videos for profile. Own profile: all videos (including processing) with uploadStatus, processingStatus for badge.
 * Other users: only READY + APPROVED so public feed never shows incomplete content.
 */
export async function getProfileVideos(profileUserId: string, currentUserId?: string | null) {
  const isOwnProfile = currentUserId != null && currentUserId === profileUserId;
  const videos = await prisma.video.findMany({
    where: isOwnProfile
      ? { creatorId: profileUserId }
      : {
          creatorId: profileUserId,
          ...CANONICAL_PUBLIC_VIDEO_WHERE,
        },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
          creatorTier: true,
          isVerified: true,
          creatorVerification: {
            where: { verificationStatus: 'APPROVED' },
            select: { verificationLevel: true },
          },
        },
      },
    },
  });
  return videos.map((v) => {
    const level = (v.creator as { creatorVerification?: { verificationLevel: string } | null }).creatorVerification?.verificationLevel ?? null;
    const { creatorVerification: _, ...creator } = v.creator;
    const base = { ...v, creator: { ...creator, verificationLevel: level } };
    if (isOwnProfile) {
      return { ...base, processingLabel: getVideoProcessingLabel(v.uploadStatus, v.processingStatus, v.createdAt) };
    }
    return base;
  });
}

/**
 * Returns videos the user has liked. Only for own profile (isOwner).
 */
export async function getProfileLikedVideos(userId: string) {
  const likes = await prisma.like.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      video: {
        include: {
          creator: { select: { displayName: true, username: true } },
        },
      },
    },
  });
  return likes
    .filter((l) => l.video && l.video.status === 'READY' && l.video.processingStatus === 'READY' && l.video.moderationStatus === 'APPROVED')
    .map((l) => {
      const v = l.video!;
      const creator = v.creator as { displayName: string; username: string };
      return {
        id: v.id,
        title: v.title,
        creator: creator.displayName ?? creator.username,
        likes: v.likesCount,
        views: v.viewsCount,
        votes: v.votesCount,
        thumbnailUrl: v.thumbnailUrl ?? null,
      };
    });
}

/**
 * Returns challenge entries for the user. Only for own profile (isOwner).
 */
/**
 * Truthful profile counters for display — derived from relations and video aggregates.
 * Do not use denormalized User.followersCount / totalLikes alone; they can drift from seed or legacy writes.
 *
 * Follow counts: **ORGANIC only** (`prisma/seed` writes mutual follows with `source: 'SEED'` for demo graph —
 * those must not show as “you follow / you are followed” on a real profile).
 */
export async function getProfileTruthfulStats(userId: string) {
  const [followers, following, aggregates] = await Promise.all([
    prisma.follow.count({ where: { creatorId: userId, source: 'ORGANIC' } }),
    prisma.follow.count({ where: { followerId: userId, source: 'ORGANIC' } }),
    prisma.video.aggregate({
      where: { creatorId: userId },
      _sum: { likesCount: true, viewsCount: true, votesCount: true },
    }),
  ]);
  return {
    followersCount: followers,
    followingCount: following,
    /** Sum of likesCount across this creator's videos (matches like API updates on Video). */
    totalLikesOnVideos: aggregates._sum.likesCount ?? 0,
    totalViewsOnVideos: aggregates._sum.viewsCount ?? 0,
    totalVotesOnVideos: aggregates._sum.votesCount ?? 0,
  };
}

export async function getProfileChallengeEntries(userId: string) {
  const entries = await prisma.challengeEntry.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      challenge: { select: { slug: true, title: true, status: true, endAt: true } },
      video: { select: { id: true } },
    },
  });
  return entries.map((e) => {
    const status =
      ['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(e.challenge.status)
        ? e.challenge.endAt && new Date() > e.challenge.endAt
          ? 'Ended'
          : 'Ended'
        : ['ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE', 'VOTING_CLOSED'].includes(e.challenge.status)
          ? 'Voting'
          : e.challenge.status === 'ENTRY_OPEN'
            ? 'Active'
            : 'Draft';
    return {
      id: e.id,
      name: e.challenge.title,
      slug: e.challenge.slug,
      status,
      videoId: e.video.id,
    };
  });
}
