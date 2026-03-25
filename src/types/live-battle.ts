/**
 * BETALENT live battle – shared types.
 * See: docs/LIVE-BATTLE-SCORING-AND-DATA.md
 */

import type { BattleStatus, BattleVoteType } from '@prisma/client';

export type { BattleStatus, BattleVoteType };

export interface LiveBattleScores {
  battleId: string;
  status: BattleStatus;
  creatorScores: {
    creatorId: string;
    slot: number;
    score: number;
    giftValue: number;
    coinVotes: number;
    superVotes: number;
  }[];
}

export interface BattleVoteInput {
  battleId: string;
  recipientCreatorId: string;
  senderId: string;
  voteType: BattleVoteType;
  amount: number;
}
