/**
 * BETALENT Weekly Global Live Challenge – get challenge, list, submit entry, leaderboard.
 * See: docs/WEEKLY-GLOBAL-LIVE-CHALLENGE.md
 *
 * Integrity: passesOriginalityForChallenge is fail-closed – if no MediaIntegrityAnalysis
 * exists for the video, entry is blocked. No silent pass. Documented in media-integrity.service.
 */

import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import type { Prisma } from '@prisma/client';
import {
  CHALLENGE_DEFAULT_COMPLETION_RATE,
  CHALLENGE_LEADERBOARD_DEFAULT_LIMIT,
  CHALLENGE_LEADERBOARD_MAX_LIMIT,
  CHALLENGE_STATUS_ALLOW_ENTRY,
  CHALLENGE_STATUS_PUBLIC,
} from '@/constants/challenge';
import { CHALLENGE_DYNAMICS } from '@/constants/ranking';
import {
  CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT,
  getLiveChallengeRecordingCapSec,
} from '@/constants/recording-modes';
import {
  getChallengeVoteSummary,
  getChallengeVotesLast24hPerVideo,
} from '@/services/challenge-vote.service';
import { passesOriginalityForChallenge } from '@/services/media-integrity.service';
import {
  applyChallengeDiversityGuard,
  computeChallengeMomentumMultiplier,
  computeChallengeRankingScore,
  computeChallengeTimeDecayMultiplier,
} from '@/services/ranking.service';
import type { ChallengeLeaderboardEntry, ChallengeListItem } from '@/types/challenge';
import { ORIGINALITY_POLICY } from '@/constants/media-integrity';
import type { ChallengeEntryStatus } from '@prisma/client';

function completionProxy(likes: number, comments: number, views: number): number {
  if (views <= 0) return CHALLENGE_DEFAULT_COMPLETION_RATE;
  return Math.min(1, ((likes + comments) / views) * 5);
}

const SUPPORTED_ORIGINALITY_POLICY_KEYS = new Set<string>([
  ORIGINALITY_POLICY.LIP_SYNC_PROHIBITED,
  ORIGINALITY_POLICY.DUPLICATE_REPOSTS_PROHIBITED,
  ORIGINALITY_POLICY.ORIGINAL_VOCAL_REQUIRED,
  ORIGINALITY_POLICY.FAKE_OR_STOLEN_PROHIBITED,
]);

/**
 * Challenge.rules is stored as a JSON array of rule strings.
 *
 * Deterministic policy extraction (no keyword mapping):
 * - We only treat strings that start with `POLICY:` as machine-readable policies.
 * - The suffix must match one of the built-in `ORIGINALITY_POLICY` values.
 *
 * Backward compatibility:
 * - We also recognize exactly one existing legacy text rule currently found in DB:
 *   "No lip-sync or fake playback. Live vocal or instrumental only."
 *   and map it to `ORIGINALITY_POLICY.LIP_SYNC_PROHIBITED`.
 *
 * If no policy token is found, we fall back to duplicate-repost policy only.
 */
function extractOriginalityPoliciesFromChallengeRules(rules: unknown): string[] {
  if (!Array.isArray(rules)) {
    return [ORIGINALITY_POLICY.DUPLICATE_REPOSTS_PROHIBITED];
  }

  const POLICY_PREFIX = 'POLICY:';
  const LEGACY_EXACT_LIP_SYNC_RULE =
    'No lip-sync or fake playback. Live vocal or instrumental only.';

  const out = new Set<string>();

  for (const r of rules) {
    if (typeof r !== 'string') continue;
    const s = r.trim();
    if (!s) continue;

    // Backward compatible mapping for the legacy exact rule currently stored in DB.
    if (s === LEGACY_EXACT_LIP_SYNC_RULE) {
      out.add(ORIGINALITY_POLICY.LIP_SYNC_PROHIBITED);
      continue;
    }

    // Deterministic machine-readable token.
    if (s.startsWith(POLICY_PREFIX)) {
      const key = s.slice(POLICY_PREFIX.length).trim();
      if (SUPPORTED_ORIGINALITY_POLICY_KEYS.has(key)) {
        out.add(key);
      }
      continue;
    }
  }

  // Fallback: enforce only the policy we can reliably compute today.
  if (out.size === 0) return [ORIGINALITY_POLICY.DUPLICATE_REPOSTS_PROHIBITED];
  return Array.from(out);
}

/**
 * List challenges visible to the public (OPEN, VOTING, ENDED).
 */
export async function listChallenges(limit = 20): Promise<ChallengeListItem[]> {
  const challenges = await prisma.challenge.findMany({
    where: { status: { in: CHALLENGE_STATUS_PUBLIC } },
    orderBy: { startAt: 'desc' },
    take: limit,
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { entries: { where: { status: 'ACTIVE' } } } },
      windows: { orderBy: { displayOrder: 'asc' }, select: { id: true, regionLabel: true, timezone: true, startsAt: true, endsAt: true, status: true } },
    },
  });

  return challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    categoryId: c.categoryId,
    categoryName: c.category.name,
    categorySlug: c.category.slug,
    status: c.status,
    startAt: c.startAt,
    endAt: c.endAt,
    entryOpenAt: c.entryOpenAt,
    entryCloseAt: c.entryCloseAt,
    votingCloseAt: c.votingCloseAt,
    isGlobalWeekly: c.isGlobalWeekly,
    prizeDescription: c.prizeDescription,
    entriesCount: c._count.entries,
    artistTheme: c.artistTheme,
    maxDurationSec: c.maxDurationSec,
    liveEventAt: c.liveEventAt,
    liveStartAt: c.liveStartAt,
    windows: c.windows,
  }));
}

/**
 * Get a challenge by slug (public detail).
 */
export async function getChallengeBySlug(slug: string) {
  return prisma.challenge.findUnique({
    where: { slug, status: { in: CHALLENGE_STATUS_PUBLIC } },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { entries: { where: { status: 'ACTIVE' } } } },
      windows: { orderBy: { displayOrder: 'asc' } },
      winners: { orderBy: { rank: 'asc' }, include: { creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
    },
  });
}

/**
 * Submit an entry: link a video to the challenge. One entry per creator per challenge.
 * For cover challenges: styleSlug required (user-chosen performance style).
 * Fails if challenge not OPEN, creator already entered, video not canonical-public-ready
 * ({@link CANONICAL_PUBLIC_VIDEO_WHERE}: READY + APPROVED + PUBLIC + playback URL, etc.),
 * wrong category, or video exceeds effective challenge max — same as upload/init with challengeSlug:
 * {@link getLiveChallengeRecordingCapSec}(challenge.maxDurationSec).
 */
export async function createEntry(params: {
  challengeId: string;
  creatorId: string;
  videoId: string;
  countryCode?: string | null;
  windowId?: string | null;
  styleSlug?: string | null;
}) {
  const { challengeId, creatorId, videoId, countryCode, windowId, styleSlug } = params;

  const [challenge, video, existing] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { status: true, categoryId: true, artistTheme: true, maxDurationSec: true, rules: true },
    }),
    prisma.video.findFirst({
      where: {
        AND: [{ id: videoId }, { creatorId }, CANONICAL_PUBLIC_VIDEO_WHERE],
      },
      select: { creatorId: true, status: true, categoryId: true, durationSec: true },
    }),
    prisma.challengeEntry.findUnique({ where: { challengeId_creatorId: { challengeId, creatorId } }, select: { id: true, status: true } }),
  ]);

  if (!challenge || !CHALLENGE_STATUS_ALLOW_ENTRY.includes(challenge.status)) {
    return { ok: false as const, code: 'CHALLENGE_CLOSED' };
  }
  if (existing?.status === 'ACTIVE') {
    return { ok: false as const, code: 'ALREADY_ENTERED' };
  }
  if (!video || video.creatorId !== creatorId) {
    return { ok: false as const, code: 'VIDEO_NOT_FOUND' };
  }
  if (video.categoryId !== challenge.categoryId) {
    return { ok: false as const, code: 'CATEGORY_MISMATCH' };
  }

  const rawChallengeMax =
    typeof challenge.maxDurationSec === 'number' &&
    Number.isFinite(challenge.maxDurationSec) &&
    challenge.maxDurationSec >= 1
      ? challenge.maxDurationSec
      : CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT;
  const maxDuration = getLiveChallengeRecordingCapSec(rawChallengeMax);
  if (video.durationSec > maxDuration) {
    return { ok: false as const, code: 'VIDEO_TOO_LONG' };
  }

  if (challenge.artistTheme && !styleSlug) {
    return { ok: false as const, code: 'STYLE_REQUIRED' };
  }

  // Enforce challenge originality/integrity policy using stored media integrity analysis.
  const policies = extractOriginalityPoliciesFromChallengeRules(challenge.rules);
  const passes = await passesOriginalityForChallenge(videoId, policies);
  if (!passes) {
    const integrity = await prisma.mediaIntegrityAnalysis.findUnique({
      where: { videoId },
      select: { originalityStatus: true, flagReason: true },
    });

    const integrityLabel =
      integrity?.flagReason ?? integrity?.originalityStatus ?? (integrity ? 'INTEGRITY_POLICY' : 'ANALYSIS_REQUIRED');

    return {
      ok: false as const,
      code: 'INTEGRITY_ORIGINALITY_REJECTED',
      message: integrity
        ? `Entry rejected by challenge originality policy (${integrityLabel}).`
        : 'This video must complete processing before it can be entered in a challenge. Please try again shortly.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.challengeEntry.upsert({
      where: { challengeId_creatorId: { challengeId, creatorId } },
      create: {
        challengeId,
        creatorId,
        videoId,
        status: 'ACTIVE',
        countryCode: countryCode ?? undefined,
        windowId: windowId ?? undefined,
        joinedAt: new Date(),
        withdrawnAt: null,
        styleSlug: styleSlug || undefined,
      },
      update: {
        videoId,
        status: 'ACTIVE',
        countryCode: countryCode ?? undefined,
        windowId: windowId ?? undefined,
        joinedAt: new Date(),
        withdrawnAt: null,
        styleSlug: styleSlug || undefined,
      },
    });
    if (styleSlug) {
      await tx.video.update({
        where: { id: videoId },
        data: { performanceStyle: styleSlug },
      });
    }
  });
  return { ok: true as const };
}

/**
 * Get ranked leaderboard for a challenge.
 * Includes: base score, time decay, momentum, finalist locking, creator/style diversity.
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limitInput?: number,
  options?: { viewerUserId?: string | null; skipDiscoveryVisibility?: boolean }
): Promise<ChallengeLeaderboardEntry[]> {
  const limit = Math.min(
    limitInput ?? CHALLENGE_LEADERBOARD_DEFAULT_LIMIT,
    CHALLENGE_LEADERBOARD_MAX_LIMIT
  );
  const skipDiscoveryVisibility = options?.skipDiscoveryVisibility === true;
  const viewerUserId = options?.viewerUserId ?? null;
  const videoWhere: Prisma.VideoWhereInput = skipDiscoveryVisibility
    ? CANONICAL_PUBLIC_VIDEO_WHERE
    : { AND: [CANONICAL_PUBLIC_VIDEO_WHERE, videoDiscoveryVisibilityWhere(viewerUserId)] };

  const [challenge, entries] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { status: true },
    }),
    prisma.challengeEntry.findMany({
      where: {
        challengeId,
        status: 'ACTIVE',
        video: videoWhere,
        OR: [
          { fairnessStatus: null },
          { fairnessStatus: 'CLEAN' },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
          },
        },
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            visibility: true,
            score: true,
            likesCount: true,
            commentsCount: true,
            viewsCount: true,
            talentScore: true,
            supportStats: true,
            watchStats: true,
            sharesLast24h: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  if (entries.length === 0) return [];

  const [voteSummary, votesLast24h] = await Promise.all([
    getChallengeVoteSummary(challengeId),
    getChallengeVotesLast24hPerVideo(
      challengeId,
      entries.map((e) => e.video.id),
      CHALLENGE_DYNAMICS.momentumWindowHours
    ),
  ]);
  const voteByVideo = new Map(voteSummary.map((v) => [v.videoId, v]));

  const hasFinalists = entries.some((e) => e.isFinalist);
  const isFinalistLocked =
    (challenge?.status === 'WINNERS_LOCKED' || challenge?.status === 'ARCHIVED') ||
    (hasFinalists && CHALLENGE_DYNAMICS.finalistLockDisablesDecayAndMomentum);

  const maxSuperVotes = Math.max(
    1,
    ...entries.map((e) => e.video.supportStats?.totalSuperVotes ?? 0)
  );
  const maxGiftCoins = Math.max(
    1,
    ...entries.map((e) => e.video.supportStats?.totalCoinsEarned ?? 0)
  );
  const maxEngagement = Math.max(
    0.01,
    ...entries.map((e) =>
      (e.video.likesCount + e.video.commentsCount) / Math.max(1, e.video.viewsCount)
    )
  );
  const maxLikes = Math.max(1, ...entries.map((e) => e.video.likesCount));
  const maxWeightedVoteScore = Math.max(
    0.01,
    ...entries.map((e) => voteByVideo.get(e.video.id)?.weightedVoteScore ?? 0)
  );
  const maxRetention = Math.max(
    0.01,
    ...entries.map((e) => {
      const ws = e.video.watchStats;
      if (!ws || ws.viewCount < 3) return 0;
      return ws.completedViewsCount / Math.max(1, ws.viewCount);
    })
  );
  const maxReplay = Math.max(0.01, ...entries.map((e) => e.video.watchStats?.replayCount ?? 0));
  const maxTalentScore = Math.max(
    0.01,
    ...entries.map((e) => (e.video.talentScore != null ? Math.min(1, e.video.talentScore / 10) : 0))
  );

  const now = Date.now();
  const momentumSignals = entries.map((e) => {
    const votes24h = votesLast24h.get(e.video.id) ?? 0;
    const shares24h = e.video.sharesLast24h ?? 0;
    return votes24h * 2 + shares24h;
  });
  const maxMomentum = Math.max(0.01, ...momentumSignals);

  const scored = entries.map((e, idx) => {
    const vote = voteByVideo.get(e.video.id);
    const baseScore = computeChallengeRankingScore({
      video: e.video,
      supportStats: e.video.supportStats ?? undefined,
      watchStats: e.video.watchStats ?? undefined,
      weightedVoteScore: vote?.weightedVoteScore,
      maxSuperVotes,
      maxGiftCoins,
      maxEngagement,
      maxLikes,
      maxWeightedVoteScore,
      maxRetention,
      maxReplay,
      maxTalentScore,
    });

    const entryCreatedAt = e.createdAt ?? e.video.createdAt;
    const ageHours = (now - new Date(entryCreatedAt).getTime()) / (60 * 60 * 1000);
    const timeDecayMult = computeChallengeTimeDecayMultiplier(ageHours, e.isFinalist && isFinalistLocked);
    const momentumRaw = momentumSignals[idx];
    const normalizedMomentum = momentumRaw / maxMomentum;
    const momentumMult = computeChallengeMomentumMultiplier(normalizedMomentum, e.isFinalist && isFinalistLocked);

    const finalScore = baseScore * timeDecayMult * momentumMult;

    return {
      entry: e,
      creatorId: e.creatorId,
      styleSlug: e.styleSlug ?? null,
      baseScore,
      finalScore,
      vote,
      dynamics: {
        ageHours,
        timeDecayMultiplier: timeDecayMult,
        momentumMultiplier: momentumMult,
        normalizedMomentum,
        isFinalistLocked: e.isFinalist && isFinalistLocked,
      },
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);

  const topN = CHALLENGE_DYNAMICS.creatorDiversityTopN;
  const hasStyles = entries.some((e) => e.styleSlug);
  const diverse = applyChallengeDiversityGuard(
    scored,
    Math.max(limit, topN),
    { maxPerCreator: CHALLENGE_DYNAMICS.creatorDiversityMaxPerCreatorInTop, maxPerStyle: CHALLENGE_DYNAMICS.styleBalanceMaxPerStyleInTop, hasStyles }
  );
  const toReturn = diverse.slice(0, limit);

  return toReturn.map((s, i) => ({
    rank: i + 1,
    creatorId: s.entry.creator.id,
    username: s.entry.creator.username,
    displayName: s.entry.creator.displayName,
    avatarUrl: s.entry.creator.avatarUrl,
    country: s.entry.creator.country,
    videoId: s.entry.video.id,
    videoTitle: s.entry.video.title,
    thumbnailUrl: s.entry.video.thumbnailUrl,
    visibility: s.entry.video.visibility,
    styleSlug: s.entry.styleSlug,
    isFinalist: s.entry.isFinalist ?? false,
    score: Math.round(s.finalScore * 1000),
    challengeScore: Math.round(s.finalScore * 1000),
    votes: s.entry.video.score,
    likesCount: s.entry.video.likesCount,
    commentsCount: s.entry.video.commentsCount,
    viewsCount: s.entry.video.viewsCount,
    votesCount: s.vote?.votesCount ?? 0,
    averageStars: s.vote?.averageStars ?? 0,
    weightedVoteScore: s.vote?.weightedVoteScore ?? 0,
    normalizedVoteScore: s.vote?.normalizedVoteScore,
  }));
}

export function resolveArenaEligibleWindow(
  windows: Array<{ id: string; startsAt: Date; endsAt: Date }>,
  now: Date = new Date()
) {
  if (!windows.length) return null;
  const current = windows.find((w) => w.startsAt <= now && w.endsAt >= now);
  if (current) return current;
  const upcoming = windows.find((w) => w.startsAt > now);
  return upcoming ?? null;
}

export function resolveArenaEligibleWindowForCountry(
  windows: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    eligibleCountries?: Array<{ countryCode: string }>;
  }>,
  countryCode: string,
  now: Date = new Date()
) {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const hasExplicitEligibility = windows.some(
    (w) => Array.isArray(w.eligibleCountries) && w.eligibleCountries.length > 0
  );

  const allowedWindows = hasExplicitEligibility
    ? windows.filter((w) => (w.eligibleCountries ?? []).some((e) => e.countryCode.toUpperCase() === normalizedCountry))
    : windows;

  return resolveArenaEligibleWindow(
    allowedWindows.map((w) => ({ id: w.id, startsAt: w.startsAt, endsAt: w.endsAt })),
    now
  );
}

export async function getChallengeArenaEntryStatus(challengeId: string, creatorId: string) {
  return prisma.challengeEntry.findUnique({
    where: { challengeId_creatorId: { challengeId, creatorId } },
    select: {
      id: true,
      status: true,
      joinedAt: true,
      withdrawnAt: true,
      updatedAt: true,
      countryCode: true,
      windowId: true,
      videoId: true,
    },
  });
}

export async function withdrawChallengeEntry(params: {
  challengeId: string;
  creatorId: string;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; code: 'ENTRY_NOT_FOUND' | 'ENTRY_NOT_ACTIVE' | 'WITHDRAW_WINDOW_CLOSED' }> {
  const now = params.now ?? new Date();
  const [challenge, entry] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: params.challengeId },
      select: { id: true, status: true, startAt: true, entryCloseAt: true, windows: { orderBy: { startsAt: 'asc' }, select: { startsAt: true } } },
    }),
    prisma.challengeEntry.findUnique({
      where: { challengeId_creatorId: { challengeId: params.challengeId, creatorId: params.creatorId } },
      select: { id: true, status: true },
    }),
  ]);

  if (!entry) return { ok: false, code: 'ENTRY_NOT_FOUND' };
  if (entry.status !== 'ACTIVE') return { ok: false, code: 'ENTRY_NOT_ACTIVE' };

  const firstWindowStart = challenge?.windows?.[0]?.startsAt ?? challenge?.startAt ?? null;
  const cutoff = firstWindowStart ?? challenge?.entryCloseAt ?? null;
  if (cutoff && now >= cutoff) return { ok: false, code: 'WITHDRAW_WINDOW_CLOSED' };

  await prisma.challengeEntry.update({
    where: { id: entry.id },
    data: { status: 'WITHDRAWN', withdrawnAt: now },
  });
  return { ok: true };
}

export async function getChallengeParticipants(params: {
  challengeId: string;
  cursor?: string;
  limit: number;
}) {
  const entries = await prisma.challengeEntry.findMany({
    where: { challengeId: params.challengeId, status: 'ACTIVE' },
    select: {
      id: true,
      creatorId: true,
      countryCode: true,
      status: true,
      joinedAt: true,
      creator: { select: { displayName: true, username: true, avatarUrl: true } },
    },
    orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > params.limit;
  const page = hasMore ? entries.slice(0, params.limit) : entries;
  const total = await prisma.challengeEntry.count({ where: { challengeId: params.challengeId, status: 'ACTIVE' } });

  return {
    participants: page.map((entry) => ({
      entryId: entry.id,
      userId: entry.creatorId,
      displayName: entry.creator.displayName,
      username: entry.creator.username,
      avatarUrl: entry.creator.avatarUrl,
      countryCode: entry.countryCode,
      status: entry.status as ChallengeEntryStatus,
      joinedAt: entry.joinedAt,
    })),
    total,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}
