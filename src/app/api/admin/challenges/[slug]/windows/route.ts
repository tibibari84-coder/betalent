/**
 * Admin: list, create challenge windows
 * GET: list windows
 * POST: create window { regionLabel, timezone, startsAt, endsAt, displayOrder?, eligibleCountryCodes? }
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      select: { id: true },
    });
    if (!challenge) return NextResponse.json({ ok: false }, { status: 404 });

    const windows = await prisma.challengeWindow.findMany({
      where: { challengeId: challenge.id },
      orderBy: { displayOrder: 'asc' },
    });
    return NextResponse.json({ ok: true, windows });
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

    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!challenge) return NextResponse.json({ ok: false }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const regionLabel = typeof body.regionLabel === 'string' ? body.regionLabel.trim() : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : 'UTC';
    const startsAt = body.startsAt != null ? new Date(body.startsAt as string) : null;
    const endsAt = body.endsAt != null ? new Date(body.endsAt as string) : null;
    const displayOrder = typeof body.displayOrder === 'number' ? body.displayOrder : 0;
    const eligibleCountryCodes = Array.isArray(body.eligibleCountryCodes)
      ? (body.eligibleCountryCodes as unknown[])
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim().toUpperCase())
          .filter((v) => v.length === 2)
      : [];

    if (!regionLabel || !startsAt || !endsAt) {
      return NextResponse.json({ ok: false, message: 'regionLabel, startsAt, endsAt required' }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ ok: false, message: 'endsAt must be after startsAt' }, { status: 400 });
    }

    const window = await prisma.challengeWindow.create({
      data: {
        challengeId: challenge.id,
        regionLabel,
        timezone,
        startsAt,
        endsAt,
        displayOrder,
        status: 'SCHEDULED',
        eligibleCountries:
          eligibleCountryCodes.length > 0
            ? {
                createMany: {
                  data: Array.from(new Set(eligibleCountryCodes)).map((countryCode) => ({ countryCode })),
                },
              }
            : undefined,
      },
      include: {
        eligibleCountries: true,
      },
    });
    return NextResponse.json({ ok: true, window });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({}, { status: 401 });
    if (e instanceof Error && e.message === 'Forbidden') return NextResponse.json({}, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
