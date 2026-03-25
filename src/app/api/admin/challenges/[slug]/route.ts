/**
 * Admin: get, update, or transition challenge
 * GET: full challenge + windows
 * PATCH: update fields
 * POST body: { action: 'open_entries' | 'close_entries' | 'close_voting' | 'lock_winners' | 'archive' }
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { lockChallengeWinners } from '@/services/challenge-winner.service';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await requireAdmin();
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        windows: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { entries: true } },
      },
    });
    if (!challenge) return NextResponse.json({ ok: false }, { status: 404 });

    return NextResponse.json({ ok: true, challenge });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({}, { status: 401 });
    if (e instanceof Error && e.message === 'Forbidden') return NextResponse.json({}, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await requireAdmin();
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    const c = await prisma.challenge.findUnique({ where: { slug } });
    if (!c) return NextResponse.json({ ok: false }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title.trim();
    if (typeof body.description === 'string') data.description = body.description.trim();
    if (body.entryOpenAt != null) data.entryOpenAt = new Date(body.entryOpenAt as string);
    if (body.entryCloseAt != null) data.entryCloseAt = new Date(body.entryCloseAt as string);
    if (body.votingCloseAt != null) data.votingCloseAt = new Date(body.votingCloseAt as string);
    if (Array.isArray(body.rules)) data.rules = (body.rules as string[]).filter((r) => typeof r === 'string');
    if (typeof body.prizeCoins === 'object' && body.prizeCoins !== null) data.prizeCoins = body.prizeCoins;
    if (typeof body.isGlobalWeekly === 'boolean') data.isGlobalWeekly = body.isGlobalWeekly;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, challenge: c });
    }

    const challenge = await prisma.challenge.update({
      where: { slug },
      data: data as object,
    });
    return NextResponse.json({ ok: true, challenge });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({}, { status: 401 });
    if (e instanceof Error && e.message === 'Forbidden') return NextResponse.json({}, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await requireAdmin();
    const slug = params.slug?.trim();
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    const body = (await req.json()) as { action?: string };
    const action = typeof body.action === 'string' ? body.action : '';

    const c = await prisma.challenge.findUnique({ where: { slug } });
    if (!c) return NextResponse.json({ ok: false }, { status: 404 });

    const validTransitions: Record<string, string> = {
      open_entries: 'ENTRY_OPEN',
      close_entries: 'ENTRY_CLOSED',
      close_voting: 'VOTING_CLOSED',
      archive: 'ARCHIVED',
    };

    if (action === 'lock_winners') {
      const r = await lockChallengeWinners(c.id);
      if (!r.ok) return NextResponse.json({ ok: false, code: r.code }, { status: 400 });
      return NextResponse.json({ ok: true, status: 'WINNERS_LOCKED', winnersCount: r.winnersCount });
    }

    const nextStatus = validTransitions[action];
    if (!nextStatus) {
      return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 });
    }

    await prisma.challenge.update({
      where: { slug },
      data: { status: nextStatus as 'ENTRY_OPEN' | 'ENTRY_CLOSED' | 'VOTING_CLOSED' | 'ARCHIVED' },
    });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({}, { status: 401 });
    if (e instanceof Error && e.message === 'Forbidden') return NextResponse.json({}, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
