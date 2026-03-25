/**
 * Admin: create weekly challenge
 * POST /api/admin/challenges
 * Body: { title, slug, description, categoryId, theme?, entryOpenAt, entryCloseAt, votingCloseAt, rules[], prizeCoins?, isGlobalWeekly? }
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VIDEO_LIMITS } from '@/constants/video-limits';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/\s+/g, '-') : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
    const theme = typeof body.theme === 'string' ? body.theme.trim() : null;
    const entryOpenAt = body.entryOpenAt != null ? new Date(body.entryOpenAt as string) : null;
    const entryCloseAt = body.entryCloseAt != null ? new Date(body.entryCloseAt as string) : null;
    const votingCloseAt = body.votingCloseAt != null ? new Date(body.votingCloseAt as string) : null;
    const rules = Array.isArray(body.rules) ? (body.rules as string[]).filter((r) => typeof r === 'string') : [];
    const prizeCoins = typeof body.prizeCoins === 'object' && body.prizeCoins !== null ? (body.prizeCoins as Record<string, number>) : { '1': 5000, '2': 3000, '3': 1000 };
    const isGlobalWeekly = body.isGlobalWeekly === true;

    if (!title || !slug || !categoryId) {
      return NextResponse.json({ ok: false, message: 'title, slug, categoryId required' }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return NextResponse.json({ ok: false, message: 'Category not found' }, { status: 404 });

    const startAt = entryOpenAt ?? new Date();
    const endAt = votingCloseAt ?? entryCloseAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const existing = await prisma.challenge.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ ok: false, message: 'Slug already in use' }, { status: 409 });

    const challenge = await prisma.challenge.create({
      data: {
        title,
        slug,
        description,
        categoryId,
        artistTheme: theme,
        rules: rules.length ? rules : ['One entry per creator per challenge.', 'Original content only.'],
        prizeDescription: 'Top 3 win coins and badges.',
        prizeCoins,
        status: 'DRAFT',
        startAt,
        endAt,
        entryOpenAt: entryOpenAt ?? startAt,
        entryCloseAt: entryCloseAt ?? endAt,
        votingCloseAt: votingCloseAt ?? endAt,
        isGlobalWeekly,
        maxDurationSec: VIDEO_LIMITS.STANDARD,
      },
    });

    return NextResponse.json({ ok: true, challenge: { id: challenge.id, slug: challenge.slug } });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({}, { status: 401 });
    if (e instanceof Error && e.message === 'Forbidden') return NextResponse.json({}, { status: 403 });
    console.error('[admin/challenges]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
