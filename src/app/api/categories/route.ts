import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json({ ok: true, categories });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
