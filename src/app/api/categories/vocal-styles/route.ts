import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VOCAL_STYLE_CATALOG, VOCAL_STYLE_SLUG_SET } from '@/constants/vocal-style-catalog';

/**
 * GET /api/categories/vocal-styles
 * DB-backed vocal styles for upload chips; order matches catalog, labels from DB when present.
 */
export async function GET() {
  try {
    const slugs = Array.from(VOCAL_STYLE_SLUG_SET);
    const rows = await prisma.category.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, name: true },
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r.name]));
    const styles = VOCAL_STYLE_CATALOG.map((c) => ({
      slug: c.slug,
      name: bySlug.get(c.slug) ?? c.name,
    }));
    return NextResponse.json({ ok: true, styles });
  } catch {
    const styles = VOCAL_STYLE_CATALOG.map((c) => ({ slug: c.slug, name: c.name }));
    return NextResponse.json({ ok: true, styles, fallback: true });
  }
}
