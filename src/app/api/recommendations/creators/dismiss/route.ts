/**
 * POST /api/recommendations/creators/dismiss
 * Body: { creatorId: string, reason?: 'NOT_INTERESTED' | 'DISMISSED' }
 * Idempotent: unique (viewer, creator) — repeated calls succeed.
 */
import { NextResponse } from 'next/server';
import { CreatorRecommendationDismissalReason } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creatorDismissSchema } from '@/lib/api-schemas';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = creatorDismissSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { creatorId, reason: reasonRaw } = parsed.data;
    if (creatorId === user.id) {
      return NextResponse.json({ ok: false, message: 'Invalid target' }, { status: 400 });
    }

    const reason =
      reasonRaw === 'DISMISSED'
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
