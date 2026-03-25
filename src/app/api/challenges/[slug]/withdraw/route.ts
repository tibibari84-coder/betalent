import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withdrawChallengeEntry } from '@/services/challenge.service';

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await requireVerifiedUser();
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false, code: 'INVALID_SLUG' }, { status: 400 });

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) return NextResponse.json({ ok: false, code: 'CHALLENGE_NOT_FOUND' }, { status: 404 });

    const result = await withdrawChallengeEntry({ challengeId: challenge.id, creatorId: user.id });
    if (!result.ok) {
      const status =
        result.code === 'ENTRY_NOT_FOUND' ? 404 :
        result.code === 'ENTRY_NOT_ACTIVE' ? 409 :
        result.code === 'WITHDRAW_WINDOW_CLOSED' ? 400 : 400;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true, code: 'WITHDRAWN' });
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
