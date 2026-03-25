/**
 * BETALENT search – creators, performances, categories/styles.
 * Uses TALENT_CATEGORIES and VOCAL_STYLES (singing, instrument, rap, gospel, etc.).
 */

import { prisma } from '@/lib/prisma';
import { TALENT_CATEGORIES, VOCAL_STYLES } from '@/constants/categories';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';

const READY_WHERE = CANONICAL_PUBLIC_VIDEO_WHERE;

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface SearchCreatorsResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  talentType: string | null;
  followersCount: number;
}

export interface SearchPerformancesResult {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewsCount: number;
  likesCount: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
  };
}

export interface SearchResult {
  creators: SearchCreatorsResult[];
  performances: SearchPerformancesResult[];
  categories: Array<{ name: string; slug: string }>;
  styles: Array<{ name: string; slug: string }>;
}

export async function search(
  q: string,
  limit = 20,
  viewerUserId: string | null = null
): Promise<SearchResult> {
  const normalized = normalizeQuery(q);
  if (normalized.length < 2) {
    return { creators: [], performances: [], categories: [], styles: [] };
  }

  const [creators, performances, catMatch, styleMatch] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          userDiscoveryVisibilityWhere(viewerUserId),
          {
            OR: [
              { moderationStatus: null },
              { moderationStatus: { notIn: ['SUSPENDED', 'BANNED'] } },
            ],
          },
          {
            OR: [
              { username: { contains: normalized, mode: 'insensitive' } },
              { displayName: { contains: normalized, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        country: true,
        talentType: true,
        _count: { select: { followers: true } },
      },
      take: limit,
    }),
    prisma.video.findMany({
      where: {
        AND: [
          READY_WHERE,
          videoDiscoveryVisibilityWhere(viewerUserId),
          {
            OR: [
              { title: { contains: normalized, mode: 'insensitive' } },
              { description: { contains: normalized, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { viewsCount: 'desc' },
      take: limit,
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, country: true },
        },
      },
    }),
    Promise.resolve(
      TALENT_CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) || c.slug.toLowerCase().includes(normalized)
      ).slice(0, 10)
    ),
    Promise.resolve(
      VOCAL_STYLES.filter(
        (s) =>
          s.slug &&
          (s.name.toLowerCase().includes(normalized) || s.slug.toLowerCase().includes(normalized))
      ).slice(0, 10)
    ),
  ]);

  return {
    creators: creators.map((c) => ({
      id: c.id,
      username: c.username,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl,
      country: c.country,
      talentType: c.talentType,
      followersCount: c._count.followers,
    })),
    performances: performances.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      viewsCount: v.viewsCount,
      likesCount: v.likesCount,
      visibility: v.visibility,
      creator: v.creator,
    })),
    categories: catMatch.map((c) => ({ name: c.name, slug: c.slug })),
    styles: styleMatch.map((s) => ({ name: s.name, slug: s.slug })),
  };
}
