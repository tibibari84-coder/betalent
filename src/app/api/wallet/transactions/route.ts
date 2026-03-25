import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wallet/transactions
 * Returns recent coin transactions for the current user (debits and credits).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

  const rows = await prisma.coinTransaction.findMany({
    where: {
      OR: [{ fromUserId: user.id }, { toUserId: user.id }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      fromUserId: true,
      toUserId: true,
      videoId: true,
      createdAt: true,
      description: true,
      video: {
        select: {
          id: true,
          title: true,
          creator: { select: { displayName: true, username: true } },
        },
      },
      fromUser: { select: { displayName: true, username: true } },
      toUser: { select: { displayName: true, username: true } },
    },
  });

  const transactions = rows.map((r) => {
    const isCredit = r.toUserId === user.id;
    return {
      id: r.id,
      type: r.type,
      amount: r.amount,
      isCredit,
      createdAt: r.createdAt.toISOString(),
      description: r.description,
      videoTitle: r.video?.title ?? null,
      creatorName: r.video?.creator?.displayName ?? null,
      creatorUsername: r.video?.creator?.username ?? null,
      counterpartyName: isCredit ? r.fromUser?.displayName : r.toUser?.displayName,
      counterpartyUsername: isCredit ? r.fromUser?.username : r.toUser?.username,
    };
  });

  return NextResponse.json({ ok: true, transactions });
}
