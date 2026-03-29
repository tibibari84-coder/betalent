import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { excludeStorageDeleteQuarantine } from '@/lib/video-delete-quarantine';

export async function GET() {
  try {
    const user = await requireAuth();
    const videos = await prisma.video.findMany({
      where: {
        creatorId: user.id,
        ...excludeStorageDeleteQuarantine,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true, slug: true } },
      },
    });
    return NextResponse.json({ ok: true, videos });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
