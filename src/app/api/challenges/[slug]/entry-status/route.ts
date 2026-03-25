import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getChallengeArenaEntryStatus, resolveArenaEligibleWindow } from '@/services/challenge.service';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false, code: 'INVALID_SLUG' }, { status: 400 });

    const [user, challenge] = await Promise.all([
      getCurrentUser(),
      prisma.challenge.findUnique({
        where: { slug },
        select: {
          id: true,
          status: true,
          startAt: true,
          entryCloseAt: true,
          windows: { orderBy: { startsAt: 'asc' }, select: { id: true, startsAt: true, endsAt: true } },
        },
      }),
    ]);

    if (!challenge) return NextResponse.json({ ok: false, code: 'CHALLENGE_NOT_FOUND' }, { status: 404 });
    if (!user) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        challengeStatus: challenge.status,
        entry: null,
        canJoin: false,
        canWithdraw: false,
      });
    }

    const entry = await getChallengeArenaEntryStatus(challenge.id, user.id);
    const now = new Date();
    const eligibleWindow = resolveArenaEligibleWindow(challenge.windows, now);
    const canJoin = ['ENTRY_OPEN', 'OPEN'].includes(challenge.status) && !!eligibleWindow && (!entry || entry.status !== 'ACTIVE');
    const firstWindowStart = challenge.windows?.[0]?.startsAt ?? null;
    const cutoff = firstWindowStart ?? challenge.startAt ?? challenge.entryCloseAt ?? null;
    const canWithdraw = !!entry && entry.status === 'ACTIVE' && (cutoff ? now < cutoff : true);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      challengeStatus: challenge.status,
      entry: entry
        ? {
            id: entry.id,
            status: entry.status,
            joinedAt: entry.joinedAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
            withdrawnAt: entry.withdrawnAt ? entry.withdrawnAt.toISOString() : null,
            countryCode: entry.countryCode,
            windowId: entry.windowId,
            videoId: entry.videoId,
          }
        : null,
      canJoin,
      canWithdraw,
      eligibleWindowId: eligibleWindow?.id ?? null,
    });
  } catch {
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
