import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { getCountryName, getFlagEmoji } from '@/lib/countries';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const VIDEO_LIMIT = 24;
const CREATORS_LIMIT = 12;

/**
 * GET /api/global/countries/[countryCode]/talent
 * Returns creators and performances for a country (ISO 3166-1 alpha-2).
 * Used by Global Talent Map for country-based discovery.
 */
export async function GET(
  _request: Request,
  { params }: { params: { countryCode: string } }
) {
  const countryCode = params.countryCode?.toUpperCase();
  if (!countryCode || countryCode.length !== 2) {
    return NextResponse.json(
      { ok: false, message: 'Invalid country code' },
      { status: 400 }
    );
  }

  try {
    const viewer = await getCurrentUser();
    const viewerId = viewer?.id ?? null;

    const userDiscoveryWhere = {
      AND: [
        { country: countryCode },
        { role: 'USER' as const },
        userDiscoveryVisibilityWhere(viewerId),
      ],
    };

    const videoDiscoveryWhere = {
      AND: [
        CANONICAL_PUBLIC_VIDEO_WHERE,
        { creator: { country: countryCode } },
        videoDiscoveryVisibilityWhere(viewerId),
      ],
    };

    const [creatorsCount, creatorAgg] = await Promise.all([
      prisma.user.count({ where: userDiscoveryWhere }),
      prisma.video.groupBy({
        by: ['creatorId'],
        where: videoDiscoveryWhere,
        _count: { _all: true },
        _sum: { votesCount: true },
      }),
    ]);

    const sortedAgg = [...creatorAgg].sort((a, b) => {
      const v = (b._sum.votesCount ?? 0) - (a._sum.votesCount ?? 0);
      if (v !== 0) return v;
      return (b._count._all ?? 0) - (a._count._all ?? 0);
    });
    const topCreatorIds = sortedAgg.slice(0, CREATORS_LIMIT).map((a) => a.creatorId);

    const [creators, videos] = await Promise.all([
      topCreatorIds.length
        ? prisma.user.findMany({
            where: {
              AND: [userDiscoveryWhere, { id: { in: topCreatorIds } }],
            },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              isVerified: true,
              creatorTier: true,
              creatorVerification: {
                where: { verificationStatus: 'APPROVED' },
                select: { verificationLevel: true },
              },
            },
          })
        : [],
      prisma.video.findMany({
        where: videoDiscoveryWhere,
        take: VIDEO_LIMIT,
        orderBy: [{ isFeatured: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }],
        include: {
          creator: {
            select: {
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
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const countryName = getCountryName(countryCode);
    const flagEmoji = getFlagEmoji(countryCode);

    const aggMap = new Map(
      creatorAgg.map((a) => [
        a.creatorId,
        {
          votes: a._sum.votesCount ?? 0,
          videos: a._count._all ?? 0,
        },
      ])
    );

    const orderIndex = new Map(topCreatorIds.map((id, i) => [id, i]));
    const creatorList = creators
      .map((u) => {
        const agg = aggMap.get(u.id) ?? { votes: 0, videos: 0 };
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          countryCode: u.country,
          countryName: getCountryName(u.country),
          country: u.country,
          isVerified: u.isVerified,
          creatorTier: u.creatorTier,
          totalVotes: agg.votes,
          videosCount: agg.videos,
          verificationLevel: u.creatorVerification?.verificationLevel ?? null,
        };
      })
      .sort((a, b) => (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999));

    const videoList = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      viewsCount: v.viewsCount,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount,
      votesCount: v.votesCount,
      talentScore: v.talentScore,
      score: v.score,
      isFeatured: v.isFeatured,
      visibility: v.visibility,
      creator: {
        id: v.creatorId,
        username: v.creator.username,
        displayName: v.creator.displayName,
        avatarUrl: v.creator.avatarUrl,
        countryCode: v.creator.country,
        countryName: getCountryName(v.creator.country),
        country: v.creator.country,
        isVerified: v.creator.isVerified,
        verificationLevel: v.creator.creatorVerification?.verificationLevel ?? null,
      },
      category: v.category,
    }));

    return NextResponse.json({
      ok: true,
      country: {
        code: countryCode,
        name: countryName,
        flagEmoji,
      },
      creatorsCount,
      creators: creatorList,
      videos: videoList,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load country talent' }, { status: 500 });
  }
}
