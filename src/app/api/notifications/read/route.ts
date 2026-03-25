import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSchemaDriftError } from '@/lib/runtime-config';

const bodySchema = z.object({
  notificationId: z.string().min(1).max(256).optional(),
  notificationIds: z.array(z.string().min(1).max(256)).max(500).optional(),
  markAll: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    const ids = new Set<string>();
    if (parsed.notificationId) ids.add(parsed.notificationId);
    if (parsed.notificationIds?.length) {
      for (const id of parsed.notificationIds) ids.add(id);
    }
    if (ids.size === 0) {
      return NextResponse.json({ ok: false, message: 'notificationId(s) required' }, { status: 400 });
    }

    const writes = Array.from(ids).map((notificationId) =>
      prisma.notificationRead.upsert({
        where: {
          userId_notificationId: {
            userId: user.id,
            notificationId,
          },
        },
        create: {
          userId: user.id,
          notificationId,
        },
        update: {
          readAt: new Date(),
        },
      })
    );
    await prisma.$transaction(writes);
    return NextResponse.json({ ok: true, marked: ids.size, markAll: !!parsed.markAll });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Invalid payload' }, { status: 400 });
    }
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for notification reads. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
