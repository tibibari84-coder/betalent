import type { ModerationStatus, Prisma, VideoModerationStatus } from '@prisma/client';

export const INTEGRITY_PUBLIC_ALLOWED_STATUSES: ModerationStatus[] = ['PENDING', 'APPROVED'];
export const INTEGRITY_PUBLIC_BLOCKED_STATUSES: ModerationStatus[] = [
  'FLAGGED',
  'LIMITED',
  'REJECTED',
  'BLOCKED',
];

export function mapIntegrityToVideoModeration(status: ModerationStatus): VideoModerationStatus {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED';
    case 'PENDING':
      return 'PENDING';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'FLAGGED':
    case 'LIMITED':
    case 'REJECTED':
      return 'FLAGGED';
    default:
      return 'PENDING';
  }
}

export function mapVideoToIntegrityModeration(status: VideoModerationStatus): ModerationStatus {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'FLAGGED':
      return 'FLAGGED';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

/**
 * Pipeline + legacy moderation + integrity alignment (no admin feed-de-list flag).
 * Use for: sync logic, or background jobs that need the same quality bar without "delisted from feed" semantics.
 */
export const PUBLIC_VIDEO_READY_WHERE: Prisma.VideoWhereInput = {
  status: 'READY',
  processingStatus: 'READY',
  moderationStatus: 'APPROVED',
  OR: [
    { mediaIntegrity: { is: null } },
    { mediaIntegrity: { is: { moderationStatus: { in: INTEGRITY_PUBLIC_ALLOWED_STATUSES } } } },
  ],
};

/**
 * Single public-product visibility gate: everything in {@link PUBLIC_VIDEO_READY_WHERE}
 * plus not admin-de-listed from all public discovery/listing surfaces (`rankingDisabled`),
 * and must have a valid playback URL (R2/storage).
 *
 * Use for: home, explore, For You, public profile, video detail, public lists, challenge/live eligibility,
 * public leaderboards, and interaction APIs that should only apply to publicly visible performances.
 *
 * Intentional exceptions: owner/admin/internal views (e.g. `/api/videos/me`, moderation queues) use their own where clauses.
 */
export const CANONICAL_PUBLIC_VIDEO_WHERE: Prisma.VideoWhereInput = {
  ...PUBLIC_VIDEO_READY_WHERE,
  rankingDisabled: false,
  videoUrl: { not: null },
  visibility: 'PUBLIC',
};

/**
 * READY + approved private performances: visible to creator on /video/[id] and own profile,
 * never in canonical public feeds (those require visibility PUBLIC).
 */
export const PRIVATE_VIDEO_OWNER_VIEW_WHERE: Prisma.VideoWhereInput = {
  ...PUBLIC_VIDEO_READY_WHERE,
  rankingDisabled: false,
  videoUrl: { not: null },
  visibility: 'PRIVATE',
};
