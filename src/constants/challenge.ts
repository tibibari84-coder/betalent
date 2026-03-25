/**
 * BETALENT Weekly Global Live Challenge – ranking weights and lifecycle config.
 * See: docs/WEEKLY-GLOBAL-LIVE-CHALLENGE.md
 */

import type { ChallengeStatus } from '@prisma/client';

/** Entry ranking: composite score = votes * W_VOTES + engagement * W_ENGAGEMENT + completion * W_COMPLETION (normalized). */
export const CHALLENGE_RANKING_WEIGHTS = {
  votes: 3,
  engagementRatio: 2,
  completionRate: 1,
} as const;

/** Default number of leaderboard entries to return. */
export const CHALLENGE_LEADERBOARD_DEFAULT_LIMIT = 50;

/** Max entries per challenge leaderboard. */
export const CHALLENGE_LEADERBOARD_MAX_LIMIT = 100;

/** Default completion-rate proxy when no watch data (0–1). */
export const CHALLENGE_DEFAULT_COMPLETION_RATE = 0.5;

/** Challenge statuses that allow new entries. */
export const CHALLENGE_STATUS_ALLOW_ENTRY: ChallengeStatus[] = ['ENTRY_OPEN'];

/** Challenge statuses visible on public listing. */
export const CHALLENGE_STATUS_PUBLIC: ChallengeStatus[] = [
  'ENTRY_OPEN',
  'ENTRY_CLOSED',
  'LIVE_UPCOMING',
  'LIVE_ACTIVE',
  'VOTING_CLOSED',
  'WINNERS_LOCKED',
  'ARCHIVED',
];

/** Statuses during which voting (ChallengeVote, live vote/gift) is accepted. */
export const CHALLENGE_STATUS_VOTING_OPEN: ChallengeStatus[] = [
  'ENTRY_OPEN',
  'ENTRY_CLOSED',
  'LIVE_UPCOMING',
  'LIVE_ACTIVE',
];

/** Statuses that indicate challenge is fully complete (winners locked or archived). */
export const CHALLENGE_STATUS_FINAL: ChallengeStatus[] = ['WINNERS_LOCKED', 'ARCHIVED'];

/** Default number of top winners to award (e.g. top 3 get coins/badge). */
export const CHALLENGE_TOP_WINNERS_COUNT = 3;
