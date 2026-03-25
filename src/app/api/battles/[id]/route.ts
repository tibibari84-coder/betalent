import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/battles/[id]
 * Returns battle detail: status, startAt, endAt, participants, winnerId (if ENDED).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const battle = await prisma.liveBattle.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          orderBy: { slot: 'asc' },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                country: true,
              },
            },
          },
        },
        winner: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });
    if (!battle) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      battle: {
        id: battle.id,
        status: battle.status,
        startAt: battle.startAt,
        endAt: battle.endAt,
        durationSec: battle.durationSec,
        winnerId: battle.winnerId,
        winner: battle.winner,
        bonusCoinsForWinner: battle.bonusCoinsForWinner,
        participants: battle.participants.map((p) => ({
          slot: p.slot,
          creator: p.creator,
        })),
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
