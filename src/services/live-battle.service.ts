/**
 * BETALENT live battle – create battle, record votes, compute scores, end battle, award winner.
 * See: docs/LIVE-BATTLE-SCORING-AND-DATA.md
 */

import { prisma } from '@/lib/prisma';
import { LIVE_BATTLE_DEFAULT_BONUS_COINS } from '@/constants/live-battle';
import type { BattleVoteType } from '@prisma/client';

export interface CreateBattleInput {
  creator1Id: string;
  creator2Id: string;
  startAt: Date;
  bonusCoinsForWinner?: number;
}

export interface RecordVoteInput {
  battleId: string;
  recipientCreatorId: string;
  senderId: string;
  voteType: BattleVoteType;
  amount: number;
}

/**
 * Create a scheduled battle with two participants. durationSec = 180.
 */
export async function createBattle(input: CreateBattleInput) {
  const endAt = new Date(
    input.startAt.getTime() + 180 * 1000
  );
  const battle = await prisma.liveBattle.create({
    data: {
      status: 'SCHEDULED',
      startAt: input.startAt,
      endAt,
      durationSec: 180,
      bonusCoinsForWinner: input.bonusCoinsForWinner ?? LIVE_BATTLE_DEFAULT_BONUS_COINS,
      participants: {
        create: [
          { creatorId: input.creator1Id, slot: 1 },
          { creatorId: input.creator2Id, slot: 2 },
        ],
      },
    },
    include: { participants: { include: { creator: { select: { id: true, username: true, displayName: true } } } } },
  });
  return battle;
}

/**
 * Record a vote (gift, coin vote, super vote) during a LIVE battle. Validates recipient is a participant.
 */
export async function recordVote(input: RecordVoteInput) {
  const battle = await prisma.liveBattle.findUnique({
    where: { id: input.battleId },
    include: { participants: { select: { creatorId: true } } },
  });
  if (!battle || battle.status !== 'LIVE') {
    return { ok: false as const, code: 'BATTLE_NOT_LIVE' };
  }
  const participantIds = battle.participants.map((p) => p.creatorId);
  if (!participantIds.includes(input.recipientCreatorId)) {
    return { ok: false as const, code: 'INVALID_RECIPIENT' };
  }
  if (input.senderId === input.recipientCreatorId) {
    return { ok: false as const, code: 'SELF_VOTE' };
  }
  if (input.amount <= 0) {
    return { ok: false as const, code: 'INVALID_AMOUNT' };
  }

  await prisma.battleVote.create({
    data: {
      battleId: input.battleId,
      recipientCreatorId: input.recipientCreatorId,
      senderId: input.senderId,
      voteType: input.voteType,
      amount: input.amount,
    },
  });
  return { ok: true as const };
}

/**
 * Get current scores per creator: battle_score = sum(amount) grouped by recipientCreatorId.
 */
export async function getBattleScores(battleId: string) {
  const battle = await prisma.liveBattle.findUnique({
    where: { id: battleId },
    include: {
      participants: {
        orderBy: { slot: 'asc' },
        include: { creator: { select: { id: true, username: true, displayName: true } } },
      },
      votes: true,
    },
  });
  if (!battle) return null;

  const creatorIds = battle.participants.map((p) => p.creatorId);
  const giftValue = new Map<string, number>();
  const coinVotes = new Map<string, number>();
  const superVotes = new Map<string, number>();
  creatorIds.forEach((id) => {
    giftValue.set(id, 0);
    coinVotes.set(id, 0);
    superVotes.set(id, 0);
  });

  for (const v of battle.votes) {
    const g = giftValue.get(v.recipientCreatorId) ?? 0;
    const c = coinVotes.get(v.recipientCreatorId) ?? 0;
    const s = superVotes.get(v.recipientCreatorId) ?? 0;
    if (v.voteType === 'GIFT') giftValue.set(v.recipientCreatorId, g + v.amount);
    else if (v.voteType === 'COIN_VOTE') coinVotes.set(v.recipientCreatorId, c + v.amount);
    else superVotes.set(v.recipientCreatorId, s + v.amount);
  }

  const creatorScores = battle.participants.map((p) => {
    const g = giftValue.get(p.creatorId) ?? 0;
    const c = coinVotes.get(p.creatorId) ?? 0;
    const s = superVotes.get(p.creatorId) ?? 0;
    const score = g + c + s;
    return {
      creatorId: p.creatorId,
      slot: p.slot,
      creator: p.creator,
      score,
      giftValue: g,
      coinVotes: c,
      superVotes: s,
    };
  });

  return {
    battle: { id: battle.id, status: battle.status, startAt: battle.startAt, endAt: battle.endAt },
    creatorScores,
  };
}

/**
 * End battle: set status ENDED, set winnerId, create BattleWinner, award bonus coins (caller must credit wallet).
 */
export async function endBattle(battleId: string) {
  const scores = await getBattleScores(battleId);
  if (!scores || scores.battle.status !== 'LIVE') {
    return { ok: false as const, code: 'BATTLE_NOT_LIVE' };
  }

  const [a, b] = scores.creatorScores;
  const winnerId = a.score >= b.score ? a.creatorId : b.creatorId;
  const loserId = a.score >= b.score ? b.creatorId : a.creatorId;
  const winnerScore = a.creatorId === winnerId ? a.score : b.score;
  const loserScore = a.creatorId === winnerId ? b.score : a.score;

  const battle = await prisma.liveBattle.findUnique({
    where: { id: battleId },
    select: { bonusCoinsForWinner: true },
  });
  const coinsAwarded = battle?.bonusCoinsForWinner ?? 0;

  await prisma.$transaction([
    prisma.liveBattle.update({
      where: { id: battleId },
      data: { status: 'ENDED', winnerId },
    }),
    prisma.battleWinner.create({
      data: {
        battleId,
        winnerId,
        winnerScore,
        loserId,
        loserScore,
        coinsAwarded,
      },
    }),
  ]);

  return {
    ok: true as const,
    winnerId,
    loserId,
    winnerScore,
    loserScore,
    coinsAwarded,
  };
}
