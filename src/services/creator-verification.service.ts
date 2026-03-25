/**
 * BETALENT Verified Creator – request, review, and trust badge logic.
 * Moderators approve/reject/revoke; User.isVerified is synced on approve/revoke.
 */

import { prisma } from '@/lib/prisma';
import type { CreatorVerificationLevel, CreatorVerificationStatus } from '@prisma/client';
import { CREATOR_VERIFICATION_LEVELS } from '@/constants/creator-verification';

export type VerificationRequestPayload = {
  socialLinks?: string[];
  portfolioLinks?: string[];
  musicPlatformLinks?: string[];
  notes?: string;
};

/** Get verification for a user (if any). */
export async function getVerificationForUser(userId: string) {
  return prisma.creatorVerification.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      verificationLevel: true,
      verificationStatus: true,
      rejectionReason: true,
      requestPayload: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Whether the user has an approved verification (shows badge). */
export async function isCreatorVerified(userId: string): Promise<boolean> {
  const v = await prisma.creatorVerification.findUnique({
    where: { userId },
    select: { verificationStatus: true },
  });
  return v?.verificationStatus === 'APPROVED';
}

/** Request verification (creates or updates to PENDING with payload). */
export async function requestVerification(
  userId: string,
  payload?: VerificationRequestPayload
): Promise<{ id: string; status: CreatorVerificationStatus }> {
  const existing = await prisma.creatorVerification.findUnique({ where: { userId } });
  if (existing?.verificationStatus === 'PENDING') {
    const updated = await prisma.creatorVerification.update({
      where: { userId },
      data: {
        requestPayload: payload ?? undefined,
        updatedAt: new Date(),
      },
    });
    return { id: updated.id, status: updated.verificationStatus };
  }
  if (existing?.verificationStatus === 'APPROVED') {
    return { id: existing.id, status: existing.verificationStatus };
  }
  const created = await prisma.creatorVerification.upsert({
    where: { userId },
    create: {
      userId,
      verificationLevel: 'STANDARD_CREATOR',
      verificationStatus: 'PENDING',
      requestPayload: payload ?? undefined,
    },
    update: {
      verificationStatus: 'PENDING',
      requestPayload: payload ?? undefined,
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: new Date(),
    },
  });
  return { id: created.id, status: created.verificationStatus };
}

/** List verification requests for moderation (PENDING first). */
export async function getVerificationRequestsForModeration(filters: {
  status?: CreatorVerificationStatus;
  cursor?: string;
  limit?: number;
}): Promise<{ items: VerificationQueueItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const where: { verificationStatus?: CreatorVerificationStatus } = {};
  if (filters.status) where.verificationStatus = filters.status;

  const list = await prisma.creatorVerification.findMany({
    where,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
          isVerified: true,
          createdAt: true,
        },
      },
    },
  });

  const hasMore = list.length > limit;
  const items: VerificationQueueItem[] = list.slice(0, limit).map((v) => ({
    id: v.id,
    userId: v.userId,
    username: v.user.username,
    displayName: v.user.displayName,
    avatarUrl: v.user.avatarUrl,
    country: v.user.country,
    verificationLevel: v.verificationLevel,
    verificationStatus: v.verificationStatus,
    requestPayload: v.requestPayload as VerificationRequestPayload | null,
    rejectionReason: v.rejectionReason,
    reviewedBy: v.reviewedBy,
    reviewedAt: v.reviewedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  return {
    items,
    nextCursor: hasMore ? list[limit - 1].id : null,
  };
}

export type VerificationQueueItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  verificationLevel: CreatorVerificationLevel;
  verificationStatus: CreatorVerificationStatus;
  requestPayload: VerificationRequestPayload | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Get single verification for moderation detail view. */
export async function getVerificationDetailForModeration(id: string) {
  const v = await prisma.creatorVerification.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
          bio: true,
          isVerified: true,
          createdAt: true,
          videosCount: true,
          followersCount: true,
        },
      },
    },
  });
  if (!v) return null;
  return {
    id: v.id,
    userId: v.userId,
    verificationLevel: v.verificationLevel,
    verificationStatus: v.verificationStatus,
    requestPayload: v.requestPayload as VerificationRequestPayload | null,
    rejectionReason: v.rejectionReason,
    reviewedBy: v.reviewedBy,
    reviewedAt: v.reviewedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    user: v.user,
  };
}

/** Perform moderation action on a verification request. Syncs User.isVerified on approve/revoke. */
export async function performVerificationAction(
  verificationId: string,
  action: 'APPROVE_VERIFICATION' | 'REJECT_VERIFICATION' | 'REVOKE_VERIFICATION' | 'REQUEST_MORE_INFO',
  moderatorId: string,
  options?: { level?: CreatorVerificationLevel; reason?: string }
): Promise<{ ok: boolean; error?: string }> {
  const v = await prisma.creatorVerification.findUnique({
    where: { id: verificationId },
    select: { id: true, userId: true, verificationStatus: true, verificationLevel: true },
  });
  if (!v) return { ok: false, error: 'Verification not found' };

  const level = options?.level && CREATOR_VERIFICATION_LEVELS.includes(options.level)
    ? options.level
    : (action === 'APPROVE_VERIFICATION' ? 'IDENTITY_VERIFIED' : v.verificationLevel);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    if (action === 'APPROVE_VERIFICATION') {
      await tx.creatorVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: 'APPROVED',
          verificationLevel: level,
          reviewedBy: moderatorId,
          reviewedAt: now,
          rejectionReason: null,
          updatedAt: now,
        },
      });
      await tx.user.update({
        where: { id: v.userId },
        data: { isVerified: true, updatedAt: now },
      });
    } else if (action === 'REJECT_VERIFICATION') {
      await tx.creatorVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: 'REJECTED',
          reviewedBy: moderatorId,
          reviewedAt: now,
          rejectionReason: options?.reason ?? null,
          updatedAt: now,
        },
      });
    } else if (action === 'REVOKE_VERIFICATION') {
      await tx.creatorVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: 'REVOKED',
          reviewedBy: moderatorId,
          reviewedAt: now,
          rejectionReason: options?.reason ?? null,
          updatedAt: now,
        },
      });
      await tx.user.update({
        where: { id: v.userId },
        data: { isVerified: false, updatedAt: now },
      });
    } else if (action === 'REQUEST_MORE_INFO') {
      await tx.creatorVerification.update({
        where: { id: verificationId },
        data: { updatedAt: now },
      });
    }
    await tx.moderationActionLog.create({
      data: {
        moderatorId,
        targetType: 'CREATOR_VERIFICATION',
        targetId: verificationId,
        actionType: action,
        previousStatus: v.verificationStatus,
        newStatus:
          action === 'APPROVE_VERIFICATION'
            ? 'APPROVED'
            : action === 'REJECT_VERIFICATION'
              ? 'REJECTED'
              : action === 'REVOKE_VERIFICATION'
                ? 'REVOKED'
                : undefined,
        note: options?.reason ?? undefined,
      },
    });
  });

  return { ok: true };
}
