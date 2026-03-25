import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { spendCoinsForSuperVote } from '@/services/coin.service';
import { upsertVideoRankingStats } from '@/services/ranking.service';
import { validateSupportAction, maybeFlagSupportForReview } from '@/services/support-validation.service';
import { SUPER_VOTE_PACKAGES, type SuperVotePackageKey } from '@/constants/coins';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  package: z.union([z.literal(1), z.literal(5), z.literal(10)]),
});

/**
 * POST /api/videos/[id]/super-vote
 * Spend coins to super-vote for a performance. Deducts from wallet, credits creator.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { id: videoId } = await params;
  let body: { package: 1 | 5 | 10 };
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid body; use { package: 1 | 5 | 10 }' },
      { status: 400 }
    );
  }

  const pkg = body.package as SuperVotePackageKey;
  if (!(pkg in SUPER_VOTE_PACKAGES)) {
    return NextResponse.json({ ok: false, message: 'Invalid package' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      creatorId: true,
      creator: { select: { allowVotesOnPerformances: true } },
    },
  });
  if (!video) {
    return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
  }
  if (user.id !== video.creatorId && !video.creator.allowVotesOnPerformances) {
    return NextResponse.json(
      { ok: false, message: 'This creator has turned off votes and super-votes on performances', code: 'VOTES_DISABLED' },
      { status: 403 }
    );
  }

  const validation = await validateSupportAction({
    userId: user.id,
    actionType: 'SUPER_VOTE',
    targetCreatorId: video.creatorId,
    videoId,
  });
  if (!validation.allowed) {
    const status = validation.code === 'FRAUD_RISK_BLOCK' ? 403 : 400;
    return NextResponse.json(
      { ok: false, message: validation.reason, code: validation.code },
      { status }
    );
  }

  const result = await spendCoinsForSuperVote(user.id, videoId, pkg);

  if (result.success) {
    if (validation.flagForReview) {
      maybeFlagSupportForReview({
        userId: user.id,
        targetUserId: video.creatorId,
        videoId,
        type: 'SUPER_VOTE',
        reason: 'HIGH_RISK_USER',
      }).catch(() => {});
    }
    upsertVideoRankingStats(videoId).catch(() => {});
  }

  if (!result.success) {
    if (result.reason === 'Insufficient balance') {
      return NextResponse.json(
        { ok: false, message: 'Insufficient coin balance', code: 'INSUFFICIENT_BALANCE' },
        { status: 400 }
      );
    }
    if (result.reason === 'Cannot super vote your own video') {
      return NextResponse.json(
        { ok: false, message: 'Cannot super vote your own video' },
        { status: 400 }
      );
    }
    if (result.reason === 'Video not found') {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: false, message: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    newBalance: result.newBalance,
    superVotes: result.superVotes,
    coinsSpent: SUPER_VOTE_PACKAGES[pkg],
  });
}
