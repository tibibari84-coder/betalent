/**
 * POST /api/recommendations/creators/dismiss
 * Body: { creatorId: string, reason?: 'NOT_INTERESTED' | 'DISMISSED' }
 * Idempotent: unique (viewer, creator) — repeated calls succeed.
 */
import { NextResponse } from 'next/server';
import { CreatorRecommendationDismissalReason } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = (await req.json()) as { creatorId?: string; reason?: string };
    const creatorId = body.creatorId?.trim();
    if (!creatorId) {
      return NextResponse.json({ ok: false, message: 'creatorId is required' }, { status: 400 });
    }
    if (creatorId === user.id) {
      return NextResponse.json({ ok: false, message: 'Invalid target' }, { status: 400 });
    }

    const reason =
      body.reason === 'DISMISSED'
        ? CreatorRecommendationDismissalReason.DISMISSED
        : CreatorRecommendationDismissalReason.NOT_INTERESTED;

    await prisma.creatorRecommendationDismissal.upsert({
      where: {
        viewerUserId_creatorUserId: { viewerUserId: user.id, creatorUserId: creatorId },
      },
      create: {
        viewerUserId: user.id,
        creatorUserId: creatorId,
        reason,
      },
      update: { reason },
    });

    return NextResponse.json({ ok: true, dismissedCreatorId: creatorId });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: 'Dismiss failed' }, { status: 500 });
  }
}
