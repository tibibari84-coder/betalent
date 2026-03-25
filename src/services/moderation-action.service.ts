/**
 * BETALENT moderation dashboard – execute actions and audit trail.
 * Every moderation action is tracked: video approved/flagged, support voided, challenge entry blocked,
 * account suspended, payout frozen, etc. All actions are logged to ModerationActionLog; notes to ModerationNote.
 * Audit log entries include: moderator, target, action, old status, new status, timestamp, note. Searchable by moderator or target ID; filter by target type and date.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ModerationActionType, ModerationTargetType } from '@prisma/client';
import { getOrCreateRiskProfile } from '@/services/fraud-risk.service';
import { performVerificationAction as performVerificationActionService } from '@/services/creator-verification.service';
import type { CreatorVerificationLevel } from '@prisma/client';
import { deleteVideoStorageObjects } from '@/services/storage-lifecycle.service';

export type PerformActionInput = {
  moderatorId: string;
  targetType: ModerationTargetType;
  targetId: string;
  actionType: ModerationActionType;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
};

const VERIFICATION_ACTIONS: ModerationActionType[] = ['APPROVE_VERIFICATION', 'REJECT_VERIFICATION', 'REVOKE_VERIFICATION', 'REQUEST_MORE_INFO'];
const VERIFICATION_LEVELS: CreatorVerificationLevel[] = ['STANDARD_CREATOR', 'IDENTITY_VERIFIED', 'TRUSTED_PERFORMER', 'OFFICIAL_ARTIST'];

const VIDEO_MODERATION_STATUSES = ['PENDING', 'APPROVED', 'FLAGGED', 'LIMITED', 'REJECTED', 'BLOCKED'] as const;
const ACCOUNT_MODERATION_STATUSES = ['CLEAN', 'WATCHLIST', 'LIMITED', 'SUSPENDED', 'BANNED'] as const;

/**
 * Perform a moderation action and log it. Applies side effects (e.g. set video status, user status).
 */
export async function performModerationAction(input: PerformActionInput): Promise<void> {
  const { moderatorId, targetType, targetId, actionType, previousStatus, newStatus, note } = input;
  const shouldDeleteVideoStorage =
    targetType === 'VIDEO' && (actionType === 'BLOCK_VIDEO' || actionType === 'DELETE_VIDEO');
  const videoForStorageCleanup = shouldDeleteVideoStorage
    ? await prisma.video.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          creatorId: true,
          storageKey: true,
          videoUrl: true,
          thumbnailUrl: true,
          mimeType: true,
        },
      })
    : null;

  if (shouldDeleteVideoStorage) {
    if (!videoForStorageCleanup) {
      throw new Error(`Video not found for storage cleanup: ${targetId}`);
    }
    const storageDelete = await deleteVideoStorageObjects(videoForStorageCleanup);
    if (storageDelete.failed.length > 0) {
      console.error('[moderation] aborting block/delete because storage cleanup failed', {
        actionType,
        videoId: targetId,
        deleted: storageDelete.deleted,
        neutralized: storageDelete.neutralized,
        failed: storageDelete.failed,
      });
      throw new Error(`Storage cleanup failed for video ${targetId}`);
    }
    if (storageDelete.neutralized.length > 0) {
      console.warn('[moderation] storage cleanup used neutralize fallback before block/delete', {
        actionType,
        videoId: targetId,
        neutralized: storageDelete.neutralized,
      });
    }
  }

  if (targetType === 'CREATOR_VERIFICATION' && VERIFICATION_ACTIONS.includes(actionType)) {
    const level = newStatus && VERIFICATION_LEVELS.includes(newStatus as CreatorVerificationLevel) ? (newStatus as CreatorVerificationLevel) : undefined;
    const result = await performVerificationActionService(targetId, actionType as 'APPROVE_VERIFICATION' | 'REJECT_VERIFICATION' | 'REVOKE_VERIFICATION' | 'REQUEST_MORE_INFO', moderatorId, { reason: note ?? undefined, level });
    if (!result.ok) throw new Error(result.error ?? 'Verification action failed');
    return;
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (targetType === 'VIDEO' && newStatus && VIDEO_MODERATION_STATUSES.includes(newStatus as (typeof VIDEO_MODERATION_STATUSES)[number])) {
      await tx.mediaIntegrityAnalysis.upsert({
        where: { videoId: targetId },
        create: {
          videoId: targetId,
          moderationStatus: newStatus as (typeof VIDEO_MODERATION_STATUSES)[number],
          originalityStatus: 'CLEAN',
          reviewedAt: new Date(),
        },
        update: { moderationStatus: newStatus as (typeof VIDEO_MODERATION_STATUSES)[number], reviewedAt: new Date(), updatedAt: new Date() },
      });
    }

    if (targetType === 'USER' && newStatus && ACCOUNT_MODERATION_STATUSES.includes(newStatus as (typeof ACCOUNT_MODERATION_STATUSES)[number])) {
      await tx.user.update({
        where: { id: targetId },
        data: { moderationStatus: newStatus as (typeof ACCOUNT_MODERATION_STATUSES)[number], updatedAt: new Date() },
      });
    }

    if (targetType === 'USER' && actionType === 'CLEAR_RISK_STATE') {
      await tx.user.update({
        where: { id: targetId },
        data: { moderationStatus: 'CLEAN', updatedAt: new Date() },
      });
      await tx.accountRiskProfile.upsert({
        where: { userId: targetId },
        create: { userId: targetId, fraudRiskScore: 0, riskLevel: 'LOW', payoutBlocked: false },
        update: { fraudRiskScore: 0, riskLevel: 'LOW', payoutBlocked: false, updatedAt: new Date() },
      });
    }

    if (targetType === 'SUPPORT_FLAG' && (actionType === 'VALIDATE_SUPPORT' || actionType === 'EXCLUDE_FROM_RANKING' || actionType === 'VOID_SUPPORT')) {
      const newFlagStatus = actionType === 'VALIDATE_SUPPORT' ? 'DISMISSED' : 'CONFIRMED_FRAUD';
      await tx.supportReviewFlag.update({
        where: { id: targetId },
        data: { status: newFlagStatus },
      });
      if (actionType === 'EXCLUDE_FROM_RANKING' || actionType === 'VOID_SUPPORT') {
        const flag = await tx.supportReviewFlag.findUnique({ where: { id: targetId }, select: { userId: true } });
        if (flag) {
          await getOrCreateRiskProfile(flag.userId);
        }
      }
    }

    if (targetType === 'SUPPORT_FLAG' && actionType === 'FREEZE_PAYOUT') {
      const flag = await tx.supportReviewFlag.findUnique({ where: { id: targetId }, select: { targetUserId: true } });
      if (flag) {
        await tx.accountRiskProfile.upsert({
          where: { userId: flag.targetUserId },
          create: { userId: flag.targetUserId, fraudRiskScore: 0, riskLevel: 'LOW', payoutBlocked: true },
          update: { payoutBlocked: true, updatedAt: new Date() },
        });
      }
    }

    if (targetType === 'CONTENT_REPORT' && (actionType === 'DISMISS_REPORT' || actionType === 'UPHOLD_REPORT')) {
      const report = await tx.contentReport.findUnique({ where: { id: targetId }, select: { videoId: true } });
      if (report) {
        const newReportStatus = actionType === 'DISMISS_REPORT' ? 'DISMISSED' : 'RESOLVED';
        await tx.contentReport.update({
          where: { id: targetId },
          data: { status: newReportStatus, reviewedBy: moderatorId, reviewedAt: new Date(), resolution: note ?? null },
        });
        const pendingCount = await tx.contentReport.count({
          where: { videoId: report.videoId, status: { in: ['PENDING', 'REVIEWING'] } },
        });
        await tx.video.update({
          where: { id: report.videoId },
          data: { reportCount: pendingCount, isFlagged: pendingCount > 0 },
        });
        if (actionType === 'UPHOLD_REPORT') {
          await tx.video.update({
            where: { id: report.videoId },
            data: { moderationStatus: 'FLAGGED' },
          });
          await tx.mediaIntegrityAnalysis.upsert({
            where: { videoId: report.videoId },
            create: { videoId: report.videoId, moderationStatus: 'FLAGGED', reviewedAt: new Date() },
            update: { moderationStatus: 'FLAGGED', reviewedAt: new Date(), updatedAt: new Date() },
          });
        }
      }
    }

    if (targetType === 'VIDEO' && actionType === 'CLEAR_VIDEO_FLAGS') {
      await tx.contentReport.updateMany({
        where: { videoId: targetId, status: { in: ['PENDING', 'REVIEWING'] } },
        data: { status: 'DISMISSED', reviewedBy: moderatorId, reviewedAt: new Date(), resolution: note ?? 'False report – flags cleared' },
      });
      await tx.video.update({
        where: { id: targetId },
        data: { reportCount: 0, isFlagged: false, moderationStatus: 'APPROVED' },
      });
      await tx.mediaIntegrityAnalysis.upsert({
        where: { videoId: targetId },
        create: { videoId: targetId, moderationStatus: 'APPROVED', originalityStatus: 'CLEAN', reviewedAt: new Date() },
        update: { moderationStatus: 'APPROVED', reviewedAt: new Date(), updatedAt: new Date() },
      });
    }

    if (targetType === 'VIDEO' && (actionType === 'BLOCK_VIDEO' || actionType === 'DELETE_VIDEO')) {
      await tx.contentReport.updateMany({
        where: { videoId: targetId, status: { in: ['PENDING', 'REVIEWING'] } },
        data: { status: 'RESOLVED', reviewedBy: moderatorId, reviewedAt: new Date(), resolution: 'Video removed' },
      });
      await tx.video.update({
        where: { id: targetId },
        data: {
          moderationStatus: 'BLOCKED',
          status: 'HIDDEN',
          reportCount: 0,
          isFlagged: false,
          videoUrl: null,
          thumbnailUrl: null,
          storageKey: null,
        },
      });
      await tx.mediaIntegrityAnalysis.upsert({
        where: { videoId: targetId },
        create: { videoId: targetId, moderationStatus: 'BLOCKED', reviewedAt: new Date() },
        update: { moderationStatus: 'BLOCKED', reviewedAt: new Date(), updatedAt: new Date() },
      });
    }

    if (targetType === 'CHALLENGE_ENTRY') {
      if (actionType === 'EXCLUDE_ENTRY_SUPPORT') {
        const entry = await tx.challengeEntry.findUnique({ where: { id: targetId }, select: { videoId: true } });
        if (entry) {
          await tx.supportReviewFlag.updateMany({
            where: { videoId: entry.videoId, status: 'PENDING' },
            data: { status: 'CONFIRMED_FRAUD' },
          });
          await tx.challengeEntry.update({
            where: { id: targetId },
            data: { fairnessStatus: 'SUPPORT_EXCLUDED' },
          });
        }
      } else if (actionType === 'FREEZE_ENTRY') {
        await tx.challengeEntry.update({
          where: { id: targetId },
          data: { fairnessStatus: 'FROZEN' },
        });
      } else if (actionType === 'DISQUALIFY_ENTRY') {
        await tx.challengeEntry.update({
          where: { id: targetId },
          data: { fairnessStatus: 'DISQUALIFIED' },
        });
      } else if (actionType === 'RESTORE_ENTRY') {
        await tx.challengeEntry.update({
          where: { id: targetId },
          data: { fairnessStatus: 'CLEAN' },
        });
      }
    }

    await tx.moderationActionLog.create({
      data: {
        moderatorId,
        targetType,
        targetId,
        actionType,
        previousStatus: previousStatus ?? undefined,
        newStatus: newStatus ?? undefined,
        note: note ?? undefined,
      },
    });
  });

}

/**
 * Add a moderation note. No side effect other than audit.
 */
export async function addModerationNote(params: {
  moderatorId: string;
  targetType: ModerationTargetType;
  targetId: string;
  note: string;
}): Promise<void> {
  await prisma.moderationNote.create({
    data: {
      moderatorId: params.moderatorId,
      targetType: params.targetType,
      targetId: params.targetId,
      note: params.note,
    },
  });
}

/**
 * Get audit log for a target (actions + notes).
 */
export async function getModerationAudit(targetType: ModerationTargetType, targetId: string) {
  const [actions, notes] = await Promise.all([
    prisma.moderationActionLog.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { moderator: { select: { username: true } } },
    }),
    prisma.moderationNote.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { moderator: { select: { username: true } } },
    }),
  ]);
  return {
    actions: actions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      previousStatus: a.previousStatus,
      newStatus: a.newStatus,
      note: a.note,
      createdAt: a.createdAt.toISOString(),
      moderatorUsername: a.moderator.username,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: n.createdAt.toISOString(),
      moderatorUsername: n.moderator.username,
    })),
  };
}

export type ModerationLogFilters = {
  targetType?: ModerationTargetType;
  moderatorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string; // targetId or moderator username (partial)
  cursor?: string;
  limit?: number;
};

export type ModerationLogEntry = {
  id: string;
  moderatorId: string;
  moderatorUsername: string;
  targetType: string;
  targetId: string;
  actionType: string;
  previousStatus: string | null;
  newStatus: string | null;
  note: string | null;
  createdAt: string;
};

const LOGS_PAGE_SIZE = 30;
const LOGS_MAX_PAGE_SIZE = 100;

/**
 * List moderation action logs (audit trail). Each entry: moderator, target (type + id), action,
 * previousStatus, newStatus, timestamp, note. Filter by targetType, moderatorId, dateFrom/dateTo;
 * search by moderator username or targetId. Pagination via cursor.
 */
export async function getModerationActionLogs(filters: ModerationLogFilters): Promise<{
  entries: ModerationLogEntry[];
  nextCursor: string | null;
}> {
  const limit = Math.min(LOGS_MAX_PAGE_SIZE, Math.max(1, filters.limit ?? LOGS_PAGE_SIZE));
  const where: Prisma.ModerationActionLogWhereInput = {};

  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.moderatorId) where.moderatorId = filters.moderatorId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
    if (filters.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { targetId: { contains: q } },
      { moderator: { username: { contains: q } } },
    ];
  }

  const logs = await prisma.moderationActionLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include: { moderator: { select: { username: true } } },
  });

  const hasMore = logs.length > limit;
  const entries = (hasMore ? logs.slice(0, limit) : logs).map((l) => ({
    id: l.id,
    moderatorId: l.moderatorId,
    moderatorUsername: l.moderator.username,
    targetType: l.targetType,
    targetId: l.targetId,
    actionType: l.actionType,
    previousStatus: l.previousStatus,
    newStatus: l.newStatus,
    note: l.note,
    createdAt: l.createdAt.toISOString(),
  }));

  return {
    entries,
    nextCursor: hasMore ? logs[limit - 1].id : null,
  };
}
