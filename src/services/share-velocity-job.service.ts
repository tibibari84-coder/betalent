import { prisma } from '@/lib/prisma';

/**
 * Recompute Video.sharesLast24h from ShareEvent (VIDEO) in the last 24 hours.
 * Run periodically via admin UI or external scheduler calling the internal job API.
 */
export async function runShareVelocityJob(): Promise<{
  videosUpdated: number;
  errors: string[];
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errors: string[] = [];
  let videosUpdated = 0;

  try {
    await prisma.video.updateMany({
      where: { status: 'READY' },
      data: { sharesLast24h: 0 },
    });

    const rows = await prisma.shareEvent.groupBy({
      by: ['resourceId'],
      where: {
        resourceType: 'VIDEO',
        createdAt: { gte: since },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      try {
        const r = await prisma.video.updateMany({
          where: { id: row.resourceId, status: 'READY' },
          data: { sharesLast24h: row._count._all },
        });
        videosUpdated += r.count;
      } catch (e) {
        errors.push(`${row.resourceId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return { videosUpdated, errors };
}
