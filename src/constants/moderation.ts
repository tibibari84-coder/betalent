/**
 * BETALENT moderation dashboard – queue types, action types, and display labels.
 * For internal admin / moderator use only. Architecture: lib/moderation-dashboard-architecture.ts.
 */

export const MODERATION_QUEUE_TYPES = [
  'reported_videos',
  'flagged_videos',
  'recent_reports',
  'suspicious_videos',
  'suspicious_accounts',
  'suspicious_support',
  'ai_integrity',
  'duplicate_media',
  'challenge_fairness',
  'verification_requests',
] as const;

export type ModerationQueueType = (typeof MODERATION_QUEUE_TYPES)[number];

export const MODERATION_QUEUE_LABELS: Record<ModerationQueueType, string> = {
  reported_videos: 'Reported Videos',
  flagged_videos: 'Flagged Videos',
  recent_reports: 'Recent Reports',
  suspicious_videos: 'Suspicious Videos',
  suspicious_accounts: 'Suspicious Accounts',
  suspicious_support: 'Suspicious Support Activity',
  ai_integrity: 'AI Voice / Integrity Review',
  duplicate_media: 'Duplicate / Stolen Media',
  challenge_fairness: 'Challenge Fairness',
  verification_requests: 'Verification Requests',
};

/** Content report type labels for UI. */
export const CONTENT_REPORT_TYPE_LABELS: Record<string, string> = {
  FAKE_PERFORMANCE: 'Fake performance',
  COPYRIGHT: 'Copyright issue',
  INAPPROPRIATE: 'Inappropriate content',
  OTHER: 'Other',
};

/** Video moderation statuses for queue display (maps to MediaIntegrityAnalysis.moderationStatus + legacy). */
export const VIDEO_MODERATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'FLAGGED',
  'LIMITED',
  'REJECTED',
  'BLOCKED',
] as const;

/** Account moderation statuses (User.moderationStatus). */
export const ACCOUNT_MODERATION_STATUSES = [
  'CLEAN',
  'WATCHLIST',
  'LIMITED',
  'SUSPENDED',
  'BANNED',
] as const;

/** Default page size for queue listing. */
export const MODERATION_QUEUE_PAGE_SIZE = 20;

/** Max page size for queue listing. */
export const MODERATION_QUEUE_MAX_PAGE_SIZE = 100;
