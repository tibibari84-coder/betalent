/**
 * BETALENT moderation dashboard – DTOs for queues, detail views, and actions.
 */

import type { ModerationQueueType } from '@/constants/moderation';

export type ModerationQueueFilters = {
  queueType: ModerationQueueType;
  riskLevel?: string;
  moderationStatus?: string;
  integrityStatus?: string;
  reportType?: string;
  dateFrom?: string;
  dateTo?: string;
  creatorId?: string;
  challengeId?: string;
  payoutBlocked?: boolean;
  search?: string; // username, video title, challenge slug, or target id
  cursor?: string;
  limit?: number;
};

export type ModerationVideoQueueItem = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  uploadDate: string;
  styleCategorySlug: string;
  aiVocalSummary: { overallScore: number | null; status: string } | null;
  integrityStatus: string;
  duplicateRiskScore: number | null;
  aiVoiceRiskScore: number | null;
  lipSyncRiskScore: number | null;
  aiVoiceRiskLevel: string | null;
  flagReason: string | null;
  moderationStatus: string;
};

export type ModerationAccountQueueItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  accountAgeDays: number;
  riskLevel: string;
  fraudRiskScore: number;
  flagsCount: number;
  suspiciousSupportCount: number;
  linkedAccountCount: number;
  moderationStatus: string | null;
  payoutBlocked: boolean;
};

export type ModerationSupportQueueItem = {
  id: string;
  flagId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName?: string;
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName?: string;
  supportType: 'GIFT' | 'SUPER_VOTE';
  amount: number;
  timestamp: string;
  fraudRiskScore: number;
  reasonFlagged: string | null;
  status: string;
  videoId: string | null;
  videoTitle: string | null;
  rankingExcluded: boolean;
  challengeImpact: { inChallenge: boolean; challengeSlug?: string; challengeTitle?: string } | null;
};

export type ModerationAiIntegrityQueueItem = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  creatorId: string;
  creatorUsername: string;
  aiVoiceSuspicionScore: number | null;
  duplicateRiskScore: number | null;
  originalityStatus: string;
  moderationStatus: string;
  flagReason: string | null;
  comparisonCandidateIds: string[];
};

export type ModerationChallengeFairnessItem = {
  id: string;
  challengeId: string;
  challengeSlug: string;
  challengeTitle: string;
  entryId: string;
  videoId: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName?: string;
  videoTitle?: string;
  supportSpike: boolean;
  suspiciousSupportCount: number;
  integrityFlagged: boolean;
  moderationStatus: string | null;
  fairnessFlags: string[];
  recommendation: string;
  fairnessStatus: string | null;
};

export type ModerationDetailVideo = ModerationVideoQueueItem & {
  supportHistory: { type: string; amount: number; createdAt: string }[];
  moderationEventHistory: { actionType: string; newStatus: string; createdAt: string; moderatorUsername: string }[];
  notes: { note: string; createdAt: string; moderatorUsername: string }[];
};

export type ModerationDetailAccount = ModerationAccountQueueItem & {
  recentFlags: { type: string; reason: string; createdAt: string }[];
  moderationEventHistory: { actionType: string; newStatus: string; createdAt: string; moderatorUsername: string }[];
  notes: { note: string; createdAt: string; moderatorUsername: string }[];
};

export type ModerationActionPayload = {
  targetType: 'VIDEO' | 'USER' | 'SUPPORT_FLAG' | 'CHALLENGE_ENTRY';
  targetId: string;
  actionType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
};
