import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { recordVote } from '@/services/live-battle.service';
import type { BattleVoteType } from '@prisma/client';

const VALID_VOTE_TYPES: BattleVoteType[] = ['GIFT', 'COIN_VOTE', 'SUPER_VOTE'];

/**
 * POST /api/battles/[id]/vote
 * Body: { recipientCreatorId: string, voteType: 'GIFT'|'COIN_VOTE'|'SUPER_VOTE', amount: number }
 * Record a vote (gift value, coin vote, or super vote) for one of the two battle creators.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = (await req.json()) as {
      recipientCreatorId?: string;
      voteType?: string;
      amount?: number;
    };
    const recipientCreatorId =
      typeof body.recipientCreatorId === 'string' ? body.recipientCreatorId.trim() : '';
    const voteType = body.voteType as BattleVoteType | undefined;
    const amount = typeof body.amount === 'number' ? body.amount : 0;

    if (!recipientCreatorId || !voteType || !VALID_VOTE_TYPES.includes(voteType) || amount <= 0) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const result = await recordVote({
      battleId: params.id,
      recipientCreatorId,
      senderId: user.id,
      voteType,
      amount,
    });

    if (!result.ok) {
      const status =
        result.code === 'BATTLE_NOT_LIVE' ? 400 :
        result.code === 'INVALID_RECIPIENT' ? 400 :
        result.code === 'SELF_VOTE' ? 400 :
        result.code === 'INVALID_AMOUNT' ? 400 : 400;
      return NextResponse.json(
        { ok: false, code: result.code },
        { status }
      );
    }
    return NextResponse.json({ ok: true, message: 'Vote recorded' });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
