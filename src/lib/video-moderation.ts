import type { ModerationStatus, Prisma, VideoModerationStatus } from '@prisma/client';
import { GLOBAL_VIDEO_FILTER } from '@/lib/video-global-filter';

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
    case 'NEEDS_REVIEW':
      return 'PENDING';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

/**
 * Core gate for “distribution-ready” video rows: upload finished **and** processing + moderation passed.
 * `uploadStatus: UPLOADED` alone is never sufficient for public surfaces — always requires READY + APPROVED below.
 */
export const PUBLIC_DISTRIBUTION_CORE_WHERE: Prisma.VideoWhereInput = {
  uploadStatus: 'UPLOADED',
  status: 'READY',
  processingStatus: 'READY',
  moderationStatus: 'APPROVED',
  OR: [
    { mediaIntegrity: { is: null } },
    { mediaIntegrity: { is: { moderationStatus: { in: INTEGRITY_PUBLIC_ALLOWED_STATUSES } } } },
  ],
};

/**
 * Pipeline + legacy moderation + integrity alignment (no admin feed-de-list flag).
 */
export const PUBLIC_VIDEO_READY_WHERE: Prisma.VideoWhereInput = {
  AND: [GLOBAL_VIDEO_FILTER, PUBLIC_DISTRIBUTION_CORE_WHERE],
};

/**
 * Single public-product visibility gate: READY + APPROVED + integrity allow-list + playback URL + PUBLIC visibility.
 * Do not hand-roll a weaker variant on listing routes — use this or {@link PUBLIC_VIDEO_READY_WHERE} where appropriate.
 */
export const CANONICAL_PUBLIC_VIDEO_WHERE: Prisma.VideoWhereInput = {
  AND: [
    GLOBAL_VIDEO_FILTER,
    PUBLIC_DISTRIBUTION_CORE_WHERE,
    { rankingDisabled: false },
    { videoUrl: { not: null } },
    { visibility: 'PUBLIC' },
  ],
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
