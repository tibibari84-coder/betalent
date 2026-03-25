/**
 * Challenge winner computation – explicit, deterministic, locked when voting closes.
 * See: docs/WEEKLY-GLOBAL-LIVE-CHALLENGE.md
 *
 * WINNER MODEL (EXPLICIT):
 * - Ranking: composite score from Video (votes, engagement, support) + live performance scores.
 * - What counts: Video.score (gifts/leaderboard), likes, comments, completion proxy; LiveVote stars + LiveGift coins.
 * - When voting closes: at votingCloseAt (or endAt). No votes/gifts after that count.
 * - Who can win: top 3 creators by final locked score. Tie-break: earlier entry createdAt.
 * - Scores lock when status transitions to WINNERS_LOCKED.
 */

import { prisma } from '@/lib/prisma';
import { CHALLENGE_TOP_WINNERS_COUNT } from '@/constants/challenge';
import { getChallengeLeaderboard } from './challenge.service';
import { credit } from '@/services/wallet.service';

export type LockWinnersResult =
  | { ok: true; winnersCount: number }
  | { ok: false; code: 'CHALLENGE_NOT_FOUND' | 'ALREADY_LOCKED' | 'INVALID_STATUS' };

/** Lock winners for a challenge. Idempotent – if already locked, returns existing count. */
export async function lockChallengeWinners(challengeId: string): Promise<LockWinnersResult> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, status: true, prizeCoins: true },
  });
  if (!challenge) return { ok: false, code: 'CHALLENGE_NOT_FOUND' };
  if (challenge.status === 'WINNERS_LOCKED' || challenge.status === 'ARCHIVED') {
    const count = await prisma.challengeWinner.count({ where: { challengeId } });
    return { ok: true, winnersCount: count };
  }
  if (challenge.status !== 'VOTING_CLOSED') {
    return { ok: false, code: 'INVALID_STATUS' };
  }

  const leaderboard = await getChallengeLeaderboard(challengeId, CHALLENGE_TOP_WINNERS_COUNT + 10, {
    skipDiscoveryVisibility: true,
  });
  const prizeMap = (challenge.prizeCoins as Record<string, number> | null) ?? { '1': 5000, '2': 3000, '3': 1000 };

  const seen = new Set<string>();
  const toCreate: { challengeId: string; creatorId: string; rank: number; coinsAwarded: number }[] = [];
  for (let i = 0; i < leaderboard.length && toCreate.length < CHALLENGE_TOP_WINNERS_COUNT; i++) {
    const e = leaderboard[i];
    if (seen.has(e.creatorId)) continue;
    seen.add(e.creatorId);
    const rank = toCreate.length + 1;
    const coins = (prizeMap[String(rank)] ?? 0) as number;
    toCreate.push({ challengeId, creatorId: e.creatorId, rank, coinsAwarded: coins });
  }

  await prisma.$transaction(async (tx) => {
    for (const w of toCreate) {
      await tx.challengeWinner.upsert({
        where: { challengeId_creatorId: { challengeId, creatorId: w.creatorId } },
        create: w,
        update: { rank: w.rank, coinsAwarded: w.coinsAwarded },
      });
    }
    await tx.challenge.update({
      where: { id: challengeId },
      data: { status: 'WINNERS_LOCKED' },
    });
  });

  for (const w of toCreate) {
    if (w.coinsAwarded > 0) {
      await credit(w.creatorId, w.coinsAwarded, {
        type: 'CHALLENGE_REWARD',
        referenceId: challengeId,
        description: `Challenge reward #${w.rank}`,
      });
    }
  }

  return { ok: true, winnersCount: toCreate.length };
}
