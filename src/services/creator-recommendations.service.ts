/**
 * BETALENT creator recommendations — deterministic ranking from real platform signals only.
 *
 * ## Candidate eligibility (all required)
 * - Not the viewer; not already followed by viewer; not dismissed by viewer (CreatorRecommendationDismissal).
 * - User passes {@link userDiscoveryVisibilityWhere} and has **PUBLIC** profile (suggestions are for non-followers;
 *   FOLLOWERS_ONLY without follow is never discoverable anyway).
 * - Account: not test/seed; passes {@link isUntrustedActor}; moderationStatus not SUSPENDED, BANNED, or LIMITED.
 * - At least one **canonical public** video: {@link CANONICAL_PUBLIC_VIDEO_WHERE} ∧ {@link videoDiscoveryVisibilityWhere}(viewer).
 *
 * ## Exclusions
 * - Self, followed, dismissed, session excludeIds (client anti-repeat).
 * - No eligible public performances → excluded.
 *
 * ## Scoring pipeline (higher = stronger). Omitted components = 0 when data missing.
 * 1. **Recency (0–40)** — max over creator’s eligible videos: 40 × 2^(-ageDays/14), age from video.createdAt.
 * 2. **Catalog depth (0–16)** — min(8, eligibleVideoCount) × 2.
 * 3. **Category affinity (0–28)** — for distinct categoryIds in creator’s top 6 eligible videos, sum
 *    min(7, viewerAffinity.categoryAffinityScores.get(cat) × 28) each (cap per category).
 * 4. **Style overlap (0–18)** — +6 per eligible video (max 3 videos) whose performanceStyle is in
 *    viewerAffinity.preferredStyleSlugs; capped at 18.
 * 5. **Negative category penalty** — if creator’s latest eligible video’s category is in
 *    viewerAffinity.negativeCategoryScores, subtract up to 10 × that score.
 * 6. **Same country (0–10)** — +10 when viewer.country and creator.country are non-null and equal (ISO-2).
 * 7. **Challenge participation (0–12)** — +12 if creator has ACTIVE ChallengeEntry in last 60 days whose video
 *    satisfies the same canonical+discovery predicate.
 * 8. **Account freshness (0–10)** — +10 × 2^(-accountAgeDays/45) for accounts &lt; 90 days old (discovery boost).
 * 9. **Audience band** — +5 if followersCount ∈ [10, 80_000] (mid-tier discoverability); +4 if followersCount &lt; 3000
 *    and account &lt; 120d (new voices without being empty — still require ≥1 public video).
 *
 * ## Degradation
 * - Cold viewer (empty affinity): components 3–5 are ~0; ranking falls back to recency, catalog, country, challenge,
 *   freshness, and audience band — honest “discovery” ordering, not fake personalization.
 *
 * ## Diversity (post-score)
 * - Greedy take: after each pick, remaining candidates with the same **primary category** (latest video) get −12
 *   penalty to reduce back-to-back same-genre slots.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isUntrustedActor } from '@/lib/actor-trust';
import { getUserAffinity } from '@/services/user-affinity.service';
import { megaCreatorScoreMultiplier, underexposedDiscoveryMultiplier } from '@/services/fair-discovery.service';

const ACCOUNT_BLOCKLIST = ['SUSPENDED', 'BANNED', 'LIMITED'] as const;

export type CreatorRecommendationPreview = {
  videoId: string;
  thumbnailUrl: string | null;
  title: string;
};

export type CreatorRecommendationDto = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  talentType: string | null;
  previews: CreatorRecommendationPreview[];
  recommendationReason: string | null;
  /** Always false when returned; followed users are excluded at query time. */
  followedByViewer: false;
};

type ScoredCreator = {
  dto: CreatorRecommendationDto;
  score: number;
  adjusted: number;
  primaryCategoryId: string | null;
  reasonFlags: {
    categoryAffinity: number;
    styleOverlap: number;
    challenge: boolean;
    country: boolean;
    freshAccount: boolean;
  };
};

function expDecay(ageDays: number, halfLifeDays: number, peak: number): number {
  if (ageDays <= 0) return peak;
  return peak * Math.pow(2, -ageDays / halfLifeDays);
}

function pickReason(flags: ScoredCreator['reasonFlags']): string | null {
  if (flags.categoryAffinity >= 10) return 'Based on categories you engage with';
  if (flags.styleOverlap >= 6) return 'Matches performance styles you watch';
  if (flags.challenge) return 'Active in weekly challenges';
  if (flags.country) return 'Popular in your region';
  if (flags.freshAccount) return 'New on BETALENT';
  return null;
}

export async function getCreatorRecommendationsForViewer(params: {
  viewerUserId: string;
  limit: number;
  excludeCreatorIds?: string[];
}): Promise<CreatorRecommendationDto[]> {
  const { viewerUserId, limit: rawLimit, excludeCreatorIds = [] } = params;
  const limit = Math.min(30, Math.max(1, Math.floor(rawLimit)));

  const [affinity, viewer] = await Promise.all([
    getUserAffinity(viewerUserId),
    prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { country: true, createdAt: true },
    }),
  ]);

  const videoEligibleWhere: Prisma.VideoWhereInput = {
    AND: [CANONICAL_PUBLIC_VIDEO_WHERE, videoDiscoveryVisibilityWhere(viewerUserId)],
  };

  const excludeSet = new Set(excludeCreatorIds.filter(Boolean));

  const userWhere: Prisma.UserWhereInput = {
    AND: [
      userDiscoveryVisibilityWhere(viewerUserId),
      { profileVisibility: 'PUBLIC' },
      { id: { not: viewerUserId } },
      { isTestAccount: false },
      { isSeedAccount: false },
      {
        OR: [{ moderationStatus: null }, { moderationStatus: { notIn: [...ACCOUNT_BLOCKLIST] } }],
      },
      {
        NOT: { followers: { some: { followerId: viewerUserId } } },
      },
      {
        NOT: {
          creatorRecommendationDismissalsAsTarget: {
            some: { viewerUserId },
          },
        },
      },
      { videos: { some: videoEligibleWhere } },
    ],
  };

  const candidates = await prisma.user.findMany({
    where: userWhere,
    take: 160,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      email: true,
      isTestAccount: true,
      isSeedAccount: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      country: true,
      talentType: true,
      followersCount: true,
      totalViews: true,
      createdAt: true,
      videos: {
        where: videoEligibleWhere,
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          createdAt: true,
          categoryId: true,
          performanceStyle: true,
        },
      },
    },
  });

  const now = Date.now();
  const challengeSince = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const trustedIds = candidates
    .filter((c) => !isUntrustedActor(c) && !excludeSet.has(c.id) && c.videos.length > 0)
    .map((c) => c.id);

  if (trustedIds.length === 0) return [];

  const challengeCreatorIds = new Set(
    (
      await prisma.challengeEntry.findMany({
        where: {
          creatorId: { in: trustedIds },
          status: 'ACTIVE',
          joinedAt: { gte: challengeSince },
          video: videoEligibleWhere,
        },
        select: { creatorId: true },
        distinct: ['creatorId'],
      })
    ).map((r) => r.creatorId)
  );

  const scored: ScoredCreator[] = [];

  for (const c of candidates) {
    if (excludeSet.has(c.id) || !trustedIds.includes(c.id)) continue;
    const vids = c.videos;
    if (vids.length === 0) continue;

    let recency = 0;
    for (const v of vids) {
      const ageDays = (now - v.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      recency = Math.max(recency, expDecay(ageDays, 14, 40));
    }

    const catalog = Math.min(8, vids.length) * 2;

    const distinctCats = Array.from(new Set(vids.map((v) => v.categoryId)));
    let categoryAffinity = 0;
    for (const cat of distinctCats) {
      const a = affinity.categoryAffinityScores.get(cat) ?? 0;
      categoryAffinity += Math.min(7, a * 28);
    }

    let styleOverlap = 0;
    for (const v of vids.slice(0, 3)) {
      if (v.performanceStyle && affinity.preferredStyleSlugs.has(v.performanceStyle)) {
        styleOverlap += 6;
      }
    }
    styleOverlap = Math.min(18, styleOverlap);

    const latestCat = vids[0]?.categoryId;
    const neg = latestCat ? affinity.negativeCategoryScores.get(latestCat) ?? 0 : 0;
    const negativePenalty = neg * 10;

    const countryMatch =
      Boolean(viewer?.country && c.country && viewer.country === c.country) ? 10 : 0;

    const challengeBoost = challengeCreatorIds.has(c.id) ? 12 : 0;

    const accountAgeDays = (now - c.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const freshAccount =
      accountAgeDays < 90 ? expDecay(accountAgeDays, 45, 10) : 0;

    let band = 0;
    if (c.followersCount >= 10 && c.followersCount <= 80_000) band += 5;
    if (c.followersCount < 3000 && accountAgeDays < 120) band += 4;

    let score =
      recency +
      catalog +
      categoryAffinity +
      styleOverlap -
      negativePenalty +
      countryMatch +
      challengeBoost +
      freshAccount +
      band;

    score *= megaCreatorScoreMultiplier(c.followersCount ?? 0);
    score *= underexposedDiscoveryMultiplier(c.totalViews ?? 0, c.followersCount ?? 0);

    const previews: CreatorRecommendationPreview[] = vids.slice(0, 3).map((v) => ({
      videoId: v.id,
      thumbnailUrl: v.thumbnailUrl,
      title: v.title,
    }));

    const reasonFlags = {
      categoryAffinity,
      styleOverlap,
      challenge: challengeBoost > 0,
      country: countryMatch > 0,
      freshAccount: accountAgeDays < 90 && freshAccount >= 3,
    };

    scored.push({
      dto: {
        id: c.id,
        displayName: c.displayName,
        username: c.username,
        avatarUrl: c.avatarUrl,
        country: c.country,
        talentType: c.talentType,
        previews,
        recommendationReason: null,
        followedByViewer: false,
      },
      score,
      adjusted: score,
      primaryCategoryId: vids[0]?.categoryId ?? null,
      reasonFlags,
    });
  }

  scored.sort((a, b) => b.adjusted - a.adjusted);

  const picked: ScoredCreator[] = [];
  const pool = [...scored];

  while (picked.length < limit && pool.length > 0) {
    pool.sort((a, b) => b.adjusted - a.adjusted);
    const next = pool.shift()!;
    picked.push(next);
    for (const rest of pool) {
      if (
        next.primaryCategoryId &&
        rest.primaryCategoryId &&
        next.primaryCategoryId === rest.primaryCategoryId
      ) {
        rest.adjusted -= 12;
      }
    }
  }

  return picked.map((p) => ({
    ...p.dto,
    recommendationReason: pickReason(p.reasonFlags),
  }));
}
