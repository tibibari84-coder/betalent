/**
 * POST /api/comments/[commentId]/report
 * Submit a moderation report for a comment. Auth required.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isSchemaDriftError } from '@/lib/runtime-config';
const schema = z.object({
  reportType: z.enum(['FAKE_PERFORMANCE', 'COPYRIGHT', 'INAPPROPRIATE', 'OTHER']),
  details: z.string().max(2000).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { commentId } = await params;
    const body = await req.json();
    const parsed = schema.parse(body);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true },
    });
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ ok: false, message: 'Comment not found' }, { status: 404 });
    }

    try {
      await prisma.commentReport.create({
        data: {
          reporterId: user.id,
          commentId,
          reportType: parsed.reportType,
          details: parsed.details?.trim() || null,
        },
      });
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
      if (code === 'P2002') {
        return NextResponse.json(
          { ok: false, message: 'You already reported this comment.' },
          { status: 409 }
        );
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Invalid report' }, { status: 400 });
    }
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for comment reports. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Report failed' }, { status: 500 });
  }
}
