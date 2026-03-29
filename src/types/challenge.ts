/**
 * BETALENT weekly challenge – shared types.
 * See: docs/WEEKLY-CHALLENGE-SYSTEM.md
 */

import type { ChallengeStatus, VideoVisibility } from '@prisma/client';

export type { ChallengeStatus };

export interface ChallengeRules {
  /** Display order; each item is one rule string. */
  rules: string[];
}

export interface ChallengePrizeCoins {
  /** Place (1-based) -> coins to award. */
  [place: string]: number;
}

export interface ChallengeWindowSummary {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}

export interface ChallengeListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  status: ChallengeStatus;
  startAt: Date;
  endAt: Date;
  entryOpenAt?: Date | null;
  entryCloseAt?: Date | null;
  votingCloseAt?: Date | null;
  isGlobalWeekly?: boolean;
  prizeDescription: string | null;
  entriesCount: number;
  artistTheme?: string | null;
  maxDurationSec?: number | null;
  liveEventAt?: Date | null;
  liveStartAt?: Date | null;
  windows?: ChallengeWindowSummary[];
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  videoId: string;
  videoTitle: string;
  thumbnailUrl?: string | null;
  /** Public challenge entries are always PUBLIC in feeds; included for menu/copy consistency. */
  visibility: VideoVisibility;
  score: number;
  votes: number;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  /** Star vote (1–5) count for this entry. */
  votesCount?: number;
  /** Average stars. */
  averageStars?: number;
  /** Bayesian-weighted vote score (small-sample protection). */
  weightedVoteScore?: number;
  /** 0–1 normalized vote score for display/ranking. */
  normalizedVoteScore?: number;
  /** Combined challenge ranking score (same as score). */
  challengeScore?: number;
  /** When true, entry is in finalist round. */
  isFinalist?: boolean;
}
