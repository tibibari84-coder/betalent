/**
 * BETALENT moderation dashboard – review queues and detail views.
 * Admin-only. Fetches suspicious videos, accounts, support flags, integrity fields (often null
 * until detectors exist), duplicates, challenge fairness.
 * Architecture: lib/moderation-dashboard-architecture.ts. Supports filter/search by risk, status, date, integrity, username, title, challenge, target id.
 */

import { Prisma, type VideoModerationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ModerationQueueType } from '@/constants/moderation';
import {
  MODERATION_QUEUE_PAGE_SIZE,
  MODERATION_QUEUE_MAX_PAGE_SIZE,
} from '@/constants/moderation';
import type {
  ModerationQueueFilters,
  ModerationVideoQueueItem,
  ModerationAccountQueueItem,
  ModerationSupportQueueItem,
  ModerationAiIntegrityQueueItem,
  ModerationChallengeFairnessItem,
} from '@/types/moderation';
import { getConfirmedFraudSupportSourceIds } from '@/services/fraud-risk.service';
import { findPotentialDuplicateVideoIds } from '@/services/media-integrity.service';
import { getVerificationRequestsForModeration } from '@/services/creator-verification.service';

const toIso = (d: Date) => d.toISOString();

function parseLimit(limit?: number): number {
  if (limit == null) return MODERATION_QUEUE_PAGE_SIZE;
  return Math.min(Math.max(1, limit), MODERATION_QUEUE_MAX_PAGE_SIZE);
}

/**
 * Suspicious Video Review Queue: videos flagged for AI voice suspicion, duplicate audio/video,
 * low-quality spam, challenge rule violations, or stolen content risk. Uses MediaIntegrityAnalysis
 * (PENDING, FLAGGED, LIMITED, REJECTED). Each item shows thumbnail, creator, style, upload date,
 * flag reason, integrity scores, moderation status.
 */
export async function getSuspiciousVideosQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationVideoQueueItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const where: Record<string, unknown> = {};
  if (filters.moderationStatus) {
    where.moderationStatus = filters.moderationStatus;
  } else {
    where.moderationStatus = { in: ['PENDING', 'FLAGGED', 'LIMITED', 'REJECTED'] };
  }
  if (filters.creatorId) where.creatorId = filters.creatorId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom);
    if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.dateTo);
  }
  if (filters.integrityStatus) where.originalityStatus = filters.integrityStatus;
  const search = filters.search?.trim();
  if (search) {
    where.video = {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { creator: { username: { contains: search, mode: 'insensitive' as const } } },
        { id: search },
      ],
    };
  }

  const analyses = await prisma.mediaIntegrityAnalysis.findMany({
    where: { ...where },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          creatorId: true,
          createdAt: true,
          category: { select: { slug: true } },
          creator: { select: { username: true, displayName: true } },
          audioAnalysis: { select: { overallVocalScore: true, analysisStatus: true } },
        },
      },
    },
  });

  const hasMore = analyses.length > limit;
  const list = (hasMore ? analyses.slice(0, limit) : analyses).map((a) => {
    const v = a.video;
    return {
      id: a.id,
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      creatorId: v.creatorId,
      creatorUsername: v.creator.username,
      creatorDisplayName: v.creator.displayName,
      uploadDate: toIso(v.createdAt),
      styleCategorySlug: v.category.slug,
      aiVocalSummary: v.audioAnalysis
        ? { overallScore: v.audioAnalysis.overallVocalScore, status: v.audioAnalysis.analysisStatus }
        : null,
      integrityStatus: a.originalityStatus ?? 'CLEAN',
      duplicateRiskScore: a.duplicateRiskScore,
      aiVoiceRiskScore: a.aiVoiceRiskScore,
      lipSyncRiskScore: a.lipSyncRiskScore,
      aiVoiceRiskLevel: a.aiVoiceRiskLevel,
      flagReason: a.flagReason,
      moderationStatus: a.moderationStatus,
    } satisfies ModerationVideoQueueItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? analyses[limit - 1].id : null,
  };
}

/**
 * Account Risk Review Dashboard: suspicious accounts with elevated risk, linked device/account signals,
 * or suspicious support count. Each item: username, account age, risk score, linked account risk,
 * suspicious support count, moderation notes, current status. Moderator actions: watchlist, warn,
 * restrict support actions, suspend, ban, clear risk state (false positive).
 */
export async function getSuspiciousAccountsQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationAccountQueueItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const now = new Date();

  const riskWhere: Record<string, unknown> = {};
  if (filters.riskLevel) riskWhere.riskLevel = filters.riskLevel;
  else riskWhere.OR = [{ riskLevel: { in: ['MEDIUM', 'HIGH', 'CRITICAL'] } }, { user: { moderationStatus: { not: null } } }];
  if (filters.payoutBlocked !== undefined) riskWhere.payoutBlocked = filters.payoutBlocked;
  const search = filters.search?.trim();
  if (search) {
    riskWhere.user = {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { displayName: { contains: search, mode: 'insensitive' as const } },
        { id: search },
      ],
    };
  }

  const profiles = await prisma.accountRiskProfile.findMany({
    where: riskWhere,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
          moderationStatus: true,
        },
      },
    },
  });

  const userIds = profiles.map((p) => p.userId);
  const flagCounts = await prisma.supportReviewFlag.groupBy({
    by: ['targetUserId'],
    where: { targetUserId: { in: userIds }, status: 'PENDING' },
    _count: { id: true },
  });
  const countByUser = new Map(flagCounts.map((f) => [f.targetUserId, f._count.id]));

  const hasMore = profiles.length > limit;
  const list = (hasMore ? profiles.slice(0, limit) : profiles).map((p) => {
    const u = p.user;
    const accountAgeDays = Math.floor((now.getTime() - u.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    return {
      id: p.id,
      userId: u.id,
      username: u.username,
      displayName: u.displayName,
      accountAgeDays,
      riskLevel: p.riskLevel,
      fraudRiskScore: p.fraudRiskScore,
      flagsCount: countByUser.get(u.id) ?? 0,
      suspiciousSupportCount: p.suspiciousSupportCount,
      linkedAccountCount: p.linkedAccountCount,
      moderationStatus: u.moderationStatus,
      payoutBlocked: p.payoutBlocked,
    } satisfies ModerationAccountQueueItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? profiles[limit - 1].id : null,
  };
}

/**
 * Suspicious Support Review Queue: super votes, gifts, coin abuse, support loops, multi-account manipulation.
 * SupportReviewFlag with status PENDING. Each item: sender, receiver, support type, amount, timestamp,
 * fraud risk score, reason flagged, challenge impact. Moderator actions: mark valid, exclude from ranking,
 * void support, escalate, freeze payout, restrict involved account.
 */
export async function getSuspiciousSupportQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationSupportQueueItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const confirmedFraud = await getConfirmedFraudSupportSourceIds();
  const supportWhere: Prisma.SupportReviewFlagWhereInput = { status: 'PENDING' };
  const search = filters.search?.trim();
  if (search) {
    supportWhere.OR = [
      { id: search },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { targetUser: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const flags = await prisma.supportReviewFlag.findMany({
    where: supportWhere,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { username: true, displayName: true } },
      targetUser: { select: { username: true, displayName: true } },
    },
  });

  const sourceIds = flags.map((f) => f.sourceId).filter(Boolean) as string[];
  const [giftTx, coinTx] = await Promise.all([
    sourceIds.length
      ? prisma.giftTransaction.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, coinAmount: true, videoId: true, createdAt: true, video: { select: { title: true } } },
        })
      : [],
    sourceIds.length
      ? prisma.coinTransaction.findMany({
          where: { id: { in: sourceIds }, type: 'SUPER_VOTE_SPENT' },
          select: { id: true, amount: true, videoId: true, createdAt: true, video: { select: { title: true } } },
        })
      : [],
  ]);
  const giftMap = new Map(giftTx.map((g) => [g.id, g]));
  const coinMap = new Map(coinTx.map((c) => [c.id, c]));

  const senderIds = Array.from(new Set(flags.map((f) => f.userId)));
  const riskProfiles = await prisma.accountRiskProfile.findMany({
    where: { userId: { in: senderIds } },
    select: { userId: true, fraudRiskScore: true },
  });
  const riskBySender = new Map(riskProfiles.map((p) => [p.userId, p.fraudRiskScore]));

  const videoIds = Array.from(
    new Set(
      flags.flatMap((f) => {
        const g = f.sourceId ? giftMap.get(f.sourceId) : null;
        const c = f.sourceId ? coinMap.get(f.sourceId) : null;
        const vid = g?.videoId ?? c?.videoId ?? f.videoId;
        return vid ? [vid] : [];
      })
    )
  );
  const challengeEntries =
    videoIds.length > 0
      ? await prisma.challengeEntry.findMany({
          where: { videoId: { in: videoIds }, challenge: { status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE', 'VOTING_CLOSED', 'WINNERS_LOCKED', 'ARCHIVED'] } } },
          select: { videoId: true, challenge: { select: { slug: true, title: true } } },
        })
      : [];
  const challengeByVideo = new Map(challengeEntries.map((e) => [e.videoId, { challengeSlug: e.challenge.slug, challengeTitle: e.challenge.title }]));

  const hasMore = flags.length > limit;
  const list = (hasMore ? flags.slice(0, limit) : flags).map((f) => {
    const g = f.sourceId ? giftMap.get(f.sourceId) : null;
    const c = f.sourceId ? coinMap.get(f.sourceId) : null;
    const amount = g?.coinAmount ?? c?.amount ?? 0;
    const videoId = g?.videoId ?? c?.videoId ?? f.videoId ?? null;
    const videoTitle = g?.video?.title ?? c?.video?.title ?? null;
    const timestamp = g?.createdAt ?? c?.createdAt ?? f.createdAt;
    const challenge = videoId ? challengeByVideo.get(videoId) : null;
    return {
      id: f.id,
      flagId: f.id,
      senderId: f.userId,
      senderUsername: f.user.username,
      senderDisplayName: f.user.displayName,
      receiverId: f.targetUserId,
      receiverUsername: f.targetUser.username,
      receiverDisplayName: f.targetUser.displayName,
      supportType: f.type === 'GIFT' ? 'GIFT' : 'SUPER_VOTE',
      amount,
      timestamp: toIso(timestamp),
      fraudRiskScore: riskBySender.get(f.userId) ?? 0,
      reasonFlagged: f.reason,
      status: f.status,
      videoId,
      videoTitle,
      rankingExcluded: f.sourceId ? confirmedFraud.has(f.sourceId) : false,
      challengeImpact: challenge ? { inChallenge: true, challengeSlug: challenge.challengeSlug, challengeTitle: challenge.challengeTitle } : { inChallenge: false },
    } satisfies ModerationSupportQueueItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? flags[limit - 1].id : null,
  };
}

/**
 * AI / integrity review: high AI voice risk or FLAGGED.
 */
export async function getAiIntegrityQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationAiIntegrityQueueItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const where: Record<string, unknown> = {
    OR: [
      { aiVoiceRiskLevel: { in: ['HIGH_RISK', 'REVIEW_REQUIRED'] } },
      { moderationStatus: 'FLAGGED' },
      { originalityStatus: { not: 'CLEAN' } },
    ],
  };
  if (filters.moderationStatus) where.moderationStatus = filters.moderationStatus;
  const search = filters.search?.trim();
  if (search) {
    where.video = {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { creator: { username: { contains: search, mode: 'insensitive' as const } } },
        { id: search },
      ],
    };
  }

  const analyses = await prisma.mediaIntegrityAnalysis.findMany({
    where,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          creatorId: true,
          creator: { select: { username: true } },
        },
      },
    },
  });

  const candidateIdsByVideo = new Map<string, string[]>();
  for (const a of analyses) {
    const ids = await findPotentialDuplicateVideoIds(
      a.videoId,
      a.audioFingerprint,
      a.videoFingerprint
    );
    candidateIdsByVideo.set(a.videoId, ids);
  }

  const hasMore = analyses.length > limit;
  const list = (hasMore ? analyses.slice(0, limit) : analyses).map((a) => {
    const v = a.video;
    return {
      id: a.id,
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      creatorId: v.creatorId,
      creatorUsername: v.creator.username,
      aiVoiceSuspicionScore: a.aiVoiceRiskScore,
      duplicateRiskScore: a.duplicateRiskScore,
      originalityStatus: a.originalityStatus,
      moderationStatus: a.moderationStatus,
      flagReason: a.flagReason,
      comparisonCandidateIds: candidateIdsByVideo.get(a.videoId) ?? [],
    } satisfies ModerationAiIntegrityQueueItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? analyses[limit - 1].id : null,
  };
}

/**
 * Duplicate / stolen media: high duplicate risk or originality not CLEAN.
 */
export async function getDuplicateMediaQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationAiIntegrityQueueItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const where: Record<string, unknown> = {
    OR: [
      { originalityStatus: { in: ['SUSPECTED_DUPLICATE', 'SUSPECTED_STOLEN', 'REVIEW_REQUIRED'] } },
      { duplicateRiskScore: { gte: 50 } },
    ],
  };
  if (filters.integrityStatus) where.originalityStatus = filters.integrityStatus;
  const search = filters.search?.trim();
  if (search) {
    where.video = {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { creator: { username: { contains: search, mode: 'insensitive' as const } } },
        { id: search },
      ],
    };
  }

  const analyses = await prisma.mediaIntegrityAnalysis.findMany({
    where,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          creatorId: true,
          creator: { select: { username: true } },
        },
      },
    },
  });

  const candidateIdsByVideo = new Map<string, string[]>();
  for (const a of analyses) {
    const ids = await findPotentialDuplicateVideoIds(
      a.videoId,
      a.audioFingerprint,
      a.videoFingerprint
    );
    candidateIdsByVideo.set(a.videoId, ids);
  }

  const hasMore = analyses.length > limit;
  const list = (hasMore ? analyses.slice(0, limit) : analyses).map((a) => {
    const v = a.video;
    return {
      id: a.id,
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      creatorId: v.creatorId,
      creatorUsername: v.creator.username,
      aiVoiceSuspicionScore: a.aiVoiceRiskScore,
      duplicateRiskScore: a.duplicateRiskScore,
      originalityStatus: a.originalityStatus,
      moderationStatus: a.moderationStatus,
      flagReason: a.flagReason,
      comparisonCandidateIds: candidateIdsByVideo.get(a.videoId) ?? [],
    } satisfies ModerationAiIntegrityQueueItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? analyses[limit - 1].id : null,
  };
}

/**
 * Challenge Fairness Review: entries with suspicious support spikes, ranking jumps, duplicate or
 * low-integrity content, or linked-account manipulation. Each item: challenge, creator, entry,
 * suspicious support metrics, fairness flags, recommendation. Actions: exclude support from challenge
 * ranking, freeze entry, disqualify, restore, approve.
 */
export async function getChallengeFairnessQueue(filters: ModerationQueueFilters): Promise<{
  items: ModerationChallengeFairnessItem[];
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const challengeWhere: Record<string, unknown> = { status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE', 'VOTING_CLOSED', 'WINNERS_LOCKED', 'ARCHIVED'] } };
  if (filters.challengeId) challengeWhere.id = filters.challengeId;
  const cfSearch = filters.search?.trim();
  if (cfSearch) {
    challengeWhere.OR = [
      { slug: { contains: cfSearch, mode: 'insensitive' as const } },
      { title: { contains: cfSearch, mode: 'insensitive' as const } },
    ];
  }

  const byEntryId = cfSearch && cfSearch.length >= 10 && !cfSearch.includes(' ');

  const entries = await prisma.challengeEntry.findMany({
    where: byEntryId ? { id: cfSearch } : { challenge: challengeWhere },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      challenge: { select: { id: true, slug: true, title: true } },
      video: {
        select: {
          id: true,
          title: true,
          mediaIntegrity: { select: { moderationStatus: true } },
        },
      },
      creator: { select: { id: true, username: true, displayName: true } },
    },
  });

  const videoIds = entries.map((e) => e.videoId);
  const [flagsByVideo, confirmedFraud] = await Promise.all([
    prisma.supportReviewFlag.groupBy({
      by: ['videoId'],
      where: { videoId: { in: videoIds }, status: 'PENDING' },
      _count: { id: true },
    }),
    getConfirmedFraudSupportSourceIds(),
  ]);
  const countByVideo = new Map(flagsByVideo.map((f) => [f.videoId!, f._count.id]));

  const hasMore = entries.length > limit;
  const list = (hasMore ? entries.slice(0, limit) : entries).map((e) => {
    const suspiciousCount = countByVideo.get(e.videoId) ?? 0;
    const supportSpike = suspiciousCount > 0;
    const integrityFlagged = e.video.mediaIntegrity
      ? ['FLAGGED', 'BLOCKED', 'LIMITED', 'REJECTED'].includes(e.video.mediaIntegrity.moderationStatus)
      : false;
    const fairnessFlags: string[] = [];
    if (supportSpike) fairnessFlags.push('SUSPICIOUS_SUPPORT');
    if (integrityFlagged) fairnessFlags.push('INTEGRITY_FLAGGED');
    if (e.fairnessStatus && e.fairnessStatus !== 'CLEAN') fairnessFlags.push(e.fairnessStatus);
    let recommendation = 'Approve';
    if (e.fairnessStatus === 'DISQUALIFIED' || e.fairnessStatus === 'FROZEN') recommendation = 'Review';
    else if (supportSpike && !integrityFlagged) recommendation = 'Exclude support from ranking';
    else if (integrityFlagged) recommendation = 'Review';
    else if (supportSpike) recommendation = 'Exclude support from ranking';
    return {
      id: e.id,
      challengeId: e.challenge.id,
      challengeSlug: e.challenge.slug,
      challengeTitle: e.challenge.title,
      entryId: e.id,
      videoId: e.video.id,
      creatorId: e.creator.id,
      creatorUsername: e.creator.username,
      creatorDisplayName: e.creator.displayName,
      videoTitle: e.video.title,
      supportSpike,
      suspiciousSupportCount: suspiciousCount,
      integrityFlagged,
      moderationStatus: e.video.mediaIntegrity?.moderationStatus ?? null,
      fairnessFlags,
      recommendation,
      fairnessStatus: e.fairnessStatus,
    } satisfies ModerationChallengeFairnessItem;
  });

  return {
    items: list,
    nextCursor: hasMore ? entries[limit - 1].id : null,
  };
}

/**
 * Reported Videos: videos with at least one ContentReport (user reports).
 */
export async function getReportedVideosQueue(filters: ModerationQueueFilters): Promise<{
  items: Array<{
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    creatorId: string;
    creatorUsername: string;
    creatorDisplayName: string;
    uploadDate: string;
    reportCount: number;
    reportReasons: string[];
    moderationStatus: string;
    createdAt: string;
  }>;
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const reportWhere: Prisma.ContentReportWhereInput = { status: { in: ['PENDING', 'REVIEWING'] } };
  if (filters.reportType) reportWhere.reportType = filters.reportType as 'FAKE_PERFORMANCE' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'OTHER';

  const andClauses: Prisma.VideoWhereInput[] = [{ contentReports: { some: reportWhere } }];
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    andClauses.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { creator: { username: { contains: q, mode: 'insensitive' } } },
        { id: q },
      ],
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
    andClauses.push({ createdAt: dateFilter });
  }
  const videoWhere: Prisma.VideoWhereInput = andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

  const videos = await prisma.video.findMany({
    where: videoWhere,
    orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      creatorId: true,
      createdAt: true,
      reportCount: true,
      moderationStatus: true,
      creator: { select: { username: true, displayName: true } },
      contentReports: {
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
        select: { reportType: true },
      },
    },
  });

  const hasMore = videos.length > limit;
  const list = (hasMore ? videos.slice(0, limit) : videos).map((v) => {
    const reasons = Array.from(new Set(v.contentReports.map((r) => r.reportType)));
    return {
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      creatorId: v.creatorId,
      creatorUsername: v.creator.username,
      creatorDisplayName: v.creator.displayName,
      uploadDate: toIso(v.createdAt),
      reportCount: v.reportCount,
      reportReasons: reasons,
      moderationStatus: v.moderationStatus,
      createdAt: toIso(v.createdAt),
    };
  });

  return { items: list, nextCursor: hasMore ? list[list.length - 1]?.videoId ?? null : null };
}

/**
 * Flagged Videos: videos with isFlagged or reportCount > 0.
 */
export async function getFlaggedVideosQueue(filters: ModerationQueueFilters): Promise<{
  items: Array<{
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    creatorId: string;
    creatorUsername: string;
    creatorDisplayName: string;
    uploadDate: string;
    reportCount: number;
    isFlagged: boolean;
    moderationStatus: string;
  }>;
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const baseFlaggedWhere: Prisma.VideoWhereInput = {
    OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }],
  };

  const whereAnd: Prisma.VideoWhereInput[] = [baseFlaggedWhere];

  if (filters.moderationStatus) {
    whereAnd.push({ moderationStatus: filters.moderationStatus as VideoModerationStatus });
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    whereAnd.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { creator: { username: { contains: q, mode: 'insensitive' } } },
        { id: q },
      ],
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    whereAnd.push({ createdAt });
  }

  const where: Prisma.VideoWhereInput = whereAnd.length === 1 ? whereAnd[0] : { AND: whereAnd };

  const videos = await prisma.video.findMany({
    where,
    orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      creatorId: true,
      createdAt: true,
      reportCount: true,
      isFlagged: true,
      moderationStatus: true,
      creator: { select: { username: true, displayName: true } },
    },
  });

  const hasMore = videos.length > limit;
  const list = (hasMore ? videos.slice(0, limit) : videos).map((v) => ({
    videoId: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    creatorId: v.creatorId,
    creatorUsername: v.creator.username,
    creatorDisplayName: v.creator.displayName,
    uploadDate: toIso(v.createdAt),
    reportCount: v.reportCount,
    isFlagged: v.isFlagged,
    moderationStatus: v.moderationStatus,
  }));

  return { items: list, nextCursor: hasMore ? list[list.length - 1]?.videoId ?? null : null };
}

/**
 * Recent Reports: newest ContentReport entries.
 */
export async function getRecentReportsQueue(filters: ModerationQueueFilters): Promise<{
  items: Array<{
    id: string;
    reportType: string;
    details: string | null;
    status: string;
    createdAt: string;
    reporterUsername: string;
    reporterDisplayName: string;
    videoId: string;
    videoTitle: string;
    creatorUsername: string;
  }>;
  nextCursor: string | null;
}> {
  const limit = parseLimit(filters.limit);
  const where: Prisma.ContentReportWhereInput = {};
  if (filters.reportType) where.reportType = filters.reportType as 'FAKE_PERFORMANCE' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'OTHER';
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { reporter: { username: { contains: q, mode: 'insensitive' } } },
      { video: { id: q } },
      { video: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const reports = await prisma.contentReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include: {
      reporter: { select: { username: true, displayName: true } },
      video: { select: { id: true, title: true, creator: { select: { username: true } } } },
    },
  });

  const hasMore = reports.length > limit;
  const list = (hasMore ? reports.slice(0, limit) : reports).map((r) => ({
    id: r.id,
    reportType: r.reportType,
    details: r.details,
    status: r.status,
    createdAt: toIso(r.createdAt),
    reporterUsername: r.reporter.username,
    reporterDisplayName: r.reporter.displayName,
    videoId: r.video.id,
    videoTitle: r.video.title,
    creatorUsername: r.video.creator.username,
  }));

  return { items: list, nextCursor: hasMore ? list[list.length - 1]?.id ?? null : null };
}

/**
 * Route to the correct queue by type.
 */
export async function getModerationQueue(filters: ModerationQueueFilters) {
  switch (filters.queueType) {
    case 'reported_videos':
      return getReportedVideosQueue(filters);
    case 'flagged_videos':
      return getFlaggedVideosQueue(filters);
    case 'recent_reports':
      return getRecentReportsQueue(filters);
    case 'suspicious_videos':
      return getSuspiciousVideosQueue(filters);
    case 'suspicious_accounts':
      return getSuspiciousAccountsQueue(filters);
    case 'suspicious_support':
      return getSuspiciousSupportQueue(filters);
    case 'ai_integrity':
      return getAiIntegrityQueue(filters);
    case 'duplicate_media':
      return getDuplicateMediaQueue(filters);
    case 'challenge_fairness':
      return getChallengeFairnessQueue(filters);
    case 'verification_requests': {
      const status = filters.moderationStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | undefined;
      return getVerificationRequestsForModeration({
        status,
        cursor: filters.cursor ?? undefined,
        limit: parseLimit(filters.limit),
      });
    }
    default:
      return { items: [], nextCursor: null };
  }
}

/**
 * Detail view for a video: queue item + support history + action log + notes.
 */
export async function getVideoModerationDetail(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      category: { select: { slug: true } },
      mediaIntegrity: true,
      audioAnalysis: true,
    },
  });
  if (!video) return null;

  const [supportHistory, actionLogs, notes, contentReports] = await Promise.all([
    prisma.giftTransaction.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { coinAmount: true, createdAt: true },
    }).then((rows) =>
      rows.map((r) => ({ type: 'GIFT', amount: r.coinAmount, createdAt: toIso(r.createdAt) }))
    ),
    prisma.moderationActionLog.findMany({
      where: { targetType: 'VIDEO', targetId: videoId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { moderator: { select: { username: true } } },
    }),
    prisma.moderationNote.findMany({
      where: { targetType: 'VIDEO', targetId: videoId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { moderator: { select: { username: true } } },
    }),
    prisma.contentReport.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: { reporter: { select: { username: true, displayName: true } } },
    }),
  ]);

  const integrity = video.mediaIntegrity;
  return {
    id: video.id,
    videoId: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    videoUrl: video.videoUrl,
    creatorId: video.creatorId,
    creatorUsername: video.creator.username,
    creatorDisplayName: video.creator.displayName,
    uploadDate: toIso(video.createdAt),
    styleCategorySlug: video.category.slug,
    aiVocalSummary: video.audioAnalysis
      ? { overallScore: video.audioAnalysis.overallVocalScore, status: video.audioAnalysis.analysisStatus }
      : null,
    integrityStatus: integrity?.originalityStatus ?? 'CLEAN',
    duplicateRiskScore: integrity?.duplicateRiskScore ?? null,
    aiVoiceRiskScore: integrity?.aiVoiceRiskScore ?? null,
    lipSyncRiskScore: integrity?.lipSyncRiskScore ?? null,
    aiVoiceRiskLevel: integrity?.aiVoiceRiskLevel ?? null,
    flagReason: integrity?.flagReason ?? null,
    moderationStatus: integrity?.moderationStatus ?? 'PENDING',
    supportHistory,
    moderationEventHistory: actionLogs.map((l) => ({
      actionType: l.actionType,
      newStatus: l.newStatus,
      createdAt: toIso(l.createdAt),
      moderatorUsername: l.moderator.username,
    })),
    notes: notes.map((n) => ({
      note: n.note,
      createdAt: toIso(n.createdAt),
      moderatorUsername: n.moderator.username,
    })),
    reportCount: video.reportCount,
    isFlagged: video.isFlagged,
    videoModerationStatus: video.moderationStatus,
    contentReports: contentReports.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      details: r.details,
      status: r.status,
      createdAt: toIso(r.createdAt),
      reporterUsername: r.reporter.username,
      reporterDisplayName: r.reporter.displayName,
    })),
  };
}

/**
 * Detail view for a user (account).
 */
export async function getAccountModerationDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { accountRiskProfile: true },
  });
  if (!user) return null;

  const [recentFlags, actionLogs, notes] = await Promise.all([
    prisma.supportReviewFlag.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { type: true, reason: true, createdAt: true },
    }),
    prisma.moderationActionLog.findMany({
      where: { targetType: 'USER', targetId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { moderator: { select: { username: true } } },
    }),
    prisma.moderationNote.findMany({
      where: { targetType: 'USER', targetId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { moderator: { select: { username: true } } },
    }),
  ]);

  const profile = user.accountRiskProfile;
  const now = new Date();
  const accountAgeDays = Math.floor((now.getTime() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000));

  return {
    id: user.id,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    accountAgeDays,
    riskLevel: profile?.riskLevel ?? 'LOW',
    fraudRiskScore: profile?.fraudRiskScore ?? 0,
    flagsCount: recentFlags.length,
    suspiciousSupportCount: profile?.suspiciousSupportCount ?? 0,
    linkedAccountCount: profile?.linkedAccountCount ?? 0,
    moderationStatus: user.moderationStatus,
    payoutBlocked: profile?.payoutBlocked ?? false,
    recentFlags: recentFlags.map((f) => ({ type: f.type, reason: f.reason ?? '', createdAt: toIso(f.createdAt) })),
    moderationEventHistory: actionLogs.map((l) => ({
      actionType: l.actionType,
      newStatus: l.newStatus,
      createdAt: toIso(l.createdAt),
      moderatorUsername: l.moderator.username,
    })),
    notes: notes.map((n) => ({
      note: n.note,
      createdAt: toIso(n.createdAt),
      moderatorUsername: n.moderator.username,
    })),
  };
}

/**
 * Detail for a support flag. Enriches with amount, fraud risk, challenge impact.
 */
export async function getSupportFlagModerationDetail(flagId: string) {
  const flag = await prisma.supportReviewFlag.findUnique({
    where: { id: flagId },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      targetUser: { select: { id: true, username: true, displayName: true } },
    },
  });
  if (!flag) return null;

  const [logs, noteList, confirmedFraud, giftTx, coinTx, senderRisk, challengeEntry] = await Promise.all([
    prisma.moderationActionLog.findMany({
      where: { targetType: 'SUPPORT_FLAG', targetId: flagId },
      orderBy: { createdAt: 'desc' },
      include: { moderator: { select: { username: true } } },
    }),
    prisma.moderationNote.findMany({
      where: { targetType: 'SUPPORT_FLAG', targetId: flagId },
      orderBy: { createdAt: 'desc' },
      include: { moderator: { select: { username: true } } },
    }),
    getConfirmedFraudSupportSourceIds(),
    flag.sourceId
      ? prisma.giftTransaction.findUnique({ where: { id: flag.sourceId }, select: { coinAmount: true, videoId: true, createdAt: true, video: { select: { title: true } } } })
      : null,
    flag.sourceId
      ? prisma.coinTransaction.findFirst({ where: { id: flag.sourceId, type: 'SUPER_VOTE_SPENT' }, select: { amount: true, videoId: true, createdAt: true, video: { select: { title: true } } } })
      : null,
    prisma.accountRiskProfile.findUnique({ where: { userId: flag.userId }, select: { fraudRiskScore: true } }),
    flag.videoId
      ? prisma.challengeEntry.findFirst({
          where: { videoId: flag.videoId, challenge: { status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE', 'VOTING_CLOSED', 'WINNERS_LOCKED', 'ARCHIVED'] } } },
          select: { challenge: { select: { slug: true, title: true } } },
        })
      : null,
  ]);

  const g = giftTx;
  const c = coinTx;
  const amount = g?.coinAmount ?? c?.amount ?? 0;
  const videoId = g?.videoId ?? c?.videoId ?? flag.videoId ?? null;
  const videoTitle = g?.video?.title ?? c?.video?.title ?? null;
  const timestamp = g?.createdAt ?? c?.createdAt ?? flag.createdAt;

  return {
    id: flag.id,
    flagId: flag.id,
    userId: flag.userId,
    senderId: flag.userId,
    senderUsername: flag.user.username,
    senderDisplayName: flag.user.displayName,
    targetUserId: flag.targetUserId,
    receiverId: flag.targetUserId,
    receiverUsername: flag.targetUser.username,
    receiverDisplayName: flag.targetUser.displayName,
    type: flag.type,
    supportType: flag.type === 'GIFT' ? 'GIFT' : 'SUPER_VOTE',
    sourceId: flag.sourceId,
    videoId,
    videoTitle,
    amount,
    timestamp: toIso(timestamp),
    reason: flag.reason,
    reasonFlagged: flag.reason,
    status: flag.status,
    fraudRiskScore: senderRisk?.fraudRiskScore ?? 0,
    rankingExcluded: flag.sourceId ? confirmedFraud.has(flag.sourceId) : false,
    challengeImpact: challengeEntry
      ? { inChallenge: true, challengeSlug: challengeEntry.challenge.slug, challengeTitle: challengeEntry.challenge.title }
      : { inChallenge: false },
    createdAt: toIso(flag.createdAt),
    moderationEventHistory: logs.map((l) => ({
      actionType: l.actionType,
      newStatus: l.newStatus,
      createdAt: toIso(l.createdAt),
      moderatorUsername: l.moderator.username,
    })),
    notes: noteList.map((n) => ({
      note: n.note,
      createdAt: toIso(n.createdAt),
      moderatorUsername: n.moderator.username,
    })),
  };
}

/**
 * Detail for a challenge entry (fairness review). Includes suspicious support metrics, flags, recommendation.
 */
export async function getChallengeEntryModerationDetail(entryId: string) {
  const entry = await prisma.challengeEntry.findUnique({
    where: { id: entryId },
    include: {
      challenge: { select: { id: true, slug: true, title: true, status: true } },
      creator: { select: { id: true, username: true, displayName: true } },
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          mediaIntegrity: { select: { moderationStatus: true, flagReason: true } },
        },
      },
    },
  });
  if (!entry) return null;

  const [supportFlags, actionLogs, notes] = await Promise.all([
    prisma.supportReviewFlag.findMany({
      where: { videoId: entry.videoId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, type: true, reason: true, status: true, createdAt: true },
    }),
    prisma.moderationActionLog.findMany({
      where: { targetType: 'CHALLENGE_ENTRY', targetId: entryId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { moderator: { select: { username: true } } },
    }),
    prisma.moderationNote.findMany({
      where: { targetType: 'CHALLENGE_ENTRY', targetId: entryId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { moderator: { select: { username: true } } },
    }),
  ]);

  const suspiciousSupportCount = supportFlags.filter((f) => f.status === 'PENDING').length;
  const supportSpike = suspiciousSupportCount > 0;
  const integrityFlagged = entry.video.mediaIntegrity
    ? ['FLAGGED', 'BLOCKED', 'LIMITED', 'REJECTED'].includes(entry.video.mediaIntegrity.moderationStatus)
    : false;
  const fairnessFlags: string[] = [];
  if (supportSpike) fairnessFlags.push('SUSPICIOUS_SUPPORT');
  if (integrityFlagged) fairnessFlags.push('INTEGRITY_FLAGGED');
  if (entry.fairnessStatus && entry.fairnessStatus !== 'CLEAN') fairnessFlags.push(entry.fairnessStatus);
  let recommendation = 'Approve';
  if (entry.fairnessStatus === 'DISQUALIFIED' || entry.fairnessStatus === 'FROZEN') recommendation = 'Review';
  else if (supportSpike) recommendation = 'Exclude support from challenge ranking';
  else if (integrityFlagged) recommendation = 'Review';

  return {
    id: entry.id,
    entryId: entry.id,
    challengeId: entry.challengeId,
    challengeSlug: entry.challenge.slug,
    challengeTitle: entry.challenge.title,
    challengeStatus: entry.challenge.status,
    creatorId: entry.creatorId,
    creatorUsername: entry.creator.username,
    creatorDisplayName: entry.creator.displayName,
    videoId: entry.video.id,
    videoTitle: entry.video.title,
    thumbnailUrl: entry.video.thumbnailUrl,
    suspiciousSupportCount,
    supportSpike,
    integrityFlagged,
    moderationStatus: entry.video.mediaIntegrity?.moderationStatus ?? null,
    flagReason: entry.video.mediaIntegrity?.flagReason ?? null,
    fairnessFlags,
    recommendation,
    fairnessStatus: entry.fairnessStatus,
    supportFlags: supportFlags.map((f) => ({ type: f.type, reason: f.reason, status: f.status, createdAt: toIso(f.createdAt) })),
    moderationEventHistory: actionLogs.map((l) => ({
      actionType: l.actionType,
      newStatus: l.newStatus,
      createdAt: toIso(l.createdAt),
      moderatorUsername: l.moderator.username,
    })),
    notes: notes.map((n) => ({
      note: n.note,
      createdAt: toIso(n.createdAt),
      moderatorUsername: n.moderator.username,
    })),
  };
}
