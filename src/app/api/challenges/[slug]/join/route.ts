import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireVerifiedUser } from '@/lib/auth';
import { CHALLENGE_STATUS_ALLOW_ENTRY } from '@/constants/challenge';
import { createEntry, resolveArenaEligibleWindowForCountry } from '@/services/challenge.service';

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await requireVerifiedUser();
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false, code: 'INVALID_SLUG' }, { status: 400 });

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        windows: {
          orderBy: { startsAt: 'asc' },
          select: { id: true, startsAt: true, endsAt: true, eligibleCountries: { select: { countryCode: true } } },
        },
      },
    });
    if (!challenge) return NextResponse.json({ ok: false, code: 'CHALLENGE_NOT_FOUND' }, { status: 404 });
    if (!CHALLENGE_STATUS_ALLOW_ENTRY.includes(challenge.status)) {
      return NextResponse.json({ ok: false, code: 'CHALLENGE_CLOSED' }, { status: 400 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { country: true },
    });
    const countryCode = userProfile?.country?.trim().toUpperCase() || null;
    if (!countryCode) {
      return NextResponse.json({ ok: false, code: 'COUNTRY_REQUIRED' }, { status: 400 });
    }

    const eligibleWindow = resolveArenaEligibleWindowForCountry(challenge.windows, countryCode, new Date());
    if (!eligibleWindow) {
      return NextResponse.json({ ok: false, code: 'NO_ELIGIBLE_WINDOW' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { videoId?: string; styleSlug?: string };
    const explicitVideoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const styleSlug = typeof body.styleSlug === 'string' ? body.styleSlug.trim() : undefined;
    if (!explicitVideoId) {
      return NextResponse.json({ ok: false, code: 'MISSING_VIDEO_ID' }, { status: 400 });
    }

    const result = await createEntry({
      challengeId: challenge.id,
      creatorId: user.id,
      videoId: explicitVideoId,
      styleSlug,
      countryCode,
      windowId: eligibleWindow.id,
    });

    if (!result.ok) {
      const status = result.code === 'ALREADY_ENTERED' ? 409 : result.code === 'INTEGRITY_ORIGINALITY_REJECTED' ? 403 : 400;
      return NextResponse.json({ ok: false, code: result.code, message: (result as { message?: string }).message }, { status });
    }

    return NextResponse.json({ ok: true, code: 'JOINED', challengeId: challenge.id, videoId: explicitVideoId, windowId: eligibleWindow.id });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json({ ok: false, code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
    }
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
