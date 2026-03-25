import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChallengeParticipants } from '@/services/challenge.service';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false, code: 'INVALID_SLUG' }, { status: 400 });

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) return NextResponse.json({ ok: false, code: 'CHALLENGE_NOT_FOUND' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor')?.trim() || undefined;
    const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;

    const result = await getChallengeParticipants({ challengeId: challenge.id, cursor, limit });
    return NextResponse.json({
      ok: true,
      participants: result.participants.map((p) => ({
        entryId: p.entryId,
        userId: p.userId,
        displayName: p.displayName,
        username: p.username,
        avatarUrl: p.avatarUrl,
        countryCode: p.countryCode,
        status: p.status,
        joinedAt: p.joinedAt.toISOString(),
      })),
      total: result.total,
      nextCursor: result.nextCursor,
    });
  } catch {
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
