import { NextResponse } from 'next/server';
import { getBattleScores } from '@/services/live-battle.service';

/**
 * GET /api/battles/[id]/scores
 * Returns current battle_score per creator (gift_value + coin_votes + super_votes).
 * Poll this during LIVE for realtime leaderboard.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scores = await getBattleScores(params.id);
    if (!scores) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      battle: scores.battle,
      creatorScores: scores.creatorScores.map((s) => ({
        creatorId: s.creatorId,
        slot: s.slot,
        creator: s.creator,
        score: s.score,
        giftValue: s.giftValue,
        coinVotes: s.coinVotes,
        superVotes: s.superVotes,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
