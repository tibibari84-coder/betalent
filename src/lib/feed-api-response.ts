/**
 * Shared JSON shape and mappers for GET /api/feed/* list responses.
 * One item type for For You, Trending, New Voices, Following, Challenge vertical feed.
 */

import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

export type FeedVideoApiItem = {
  id: string;
  creatorId: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  title: string;
  /** Vocal / category label for feed metadata (from Category.name). */
  styleLabel?: string;
  thumbnailUrl?: string;
  videoUrl?: string | null;
  durationSec: number;
  challengeName?: string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    country?: string | null;
    verified?: boolean;
    verificationLevel?: string | null;
  };
  stats: {
    likesCount: number;
    viewsCount: number;
    commentsCount: number;
    votesCount: number;
    talentScore: number | null;
  };
};

type CreatorWithBadge = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  isVerified: boolean;
  creatorVerification?: { verificationLevel: string } | null;
};

type VideoRowForFeed = {
  id: string;
  creatorId: string;
  visibility: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  durationSec: number;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  votesCount: number;
  talentScore: number | null;
  creator: CreatorWithBadge;
  category?: { name: string; slug: string } | null;
};

export function mapVideoRowToFeedItem(
  v: VideoRowForFeed,
  challengeName?: string
): FeedVideoApiItem {
  return {
    id: v.id,
    creatorId: v.creatorId,
    visibility: v.visibility as 'PUBLIC' | 'PRIVATE',
    title: v.title,
    thumbnailUrl: v.thumbnailUrl ?? undefined,
    videoUrl: v.videoUrl ?? undefined,
    durationSec: v.durationSec,
    challengeName,
    styleLabel: v.category?.name,
    creator: {
      id: v.creator.id,
      displayName: v.creator.displayName,
      username: v.creator.username,
      avatarUrl: v.creator.avatarUrl,
      country: v.creator.country ?? null,
      verified: v.creator.isVerified,
      verificationLevel: v.creator.creatorVerification?.verificationLevel ?? null,
    },
    stats: {
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      commentsCount: v.commentsCount,
      votesCount: v.votesCount,
      talentScore: v.talentScore ?? null,
    },
  };
}

const feedCreatorSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  country: true,
  isVerified: true,
  creatorVerification: {
    where: { verificationStatus: 'APPROVED' as const },
    select: { verificationLevel: true },
  },
} as const;

/**
 * Load videos by ID list order; drops missing / ineligible rows (defensive).
 */
export async function loadFeedVideosInOrder(orderedIds: string[]): Promise<FeedVideoApiItem[]> {
  if (orderedIds.length === 0) return [];

  const videos = await prisma.video.findMany({
    where: {
      id: { in: orderedIds },
      ...CANONICAL_PUBLIC_VIDEO_WHERE,
    },
    include: {
      creator: { select: feedCreatorSelect },
      category: { select: { name: true, slug: true } },
    },
  });

  const byId = new Map(videos.map((v) => [v.id, v]));
  const ordered: FeedVideoApiItem[] = [];
  for (const id of orderedIds) {
    const v = byId.get(id);
    if (v) ordered.push(mapVideoRowToFeedItem(v as VideoRowForFeed));
  }
  return ordered;
}

export { feedCreatorSelect };
