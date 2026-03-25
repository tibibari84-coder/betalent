import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gifts
 * Returns active gifts for the gift panel (id, name, slug, coinCost, rarityTier).
 */
export async function GET() {
  const gifts = await prisma.gift.findMany({
    where: { isActive: true },
    orderBy: [{ coinCost: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      coinCost: true,
      rarityTier: true,
    },
  });
  return NextResponse.json({ ok: true, gifts });
}
