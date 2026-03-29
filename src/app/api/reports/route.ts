/**
 * POST /api/reports
 * Report a video: fake performance, copyright, or other.
 * Requires auth. One report per (reporter, video, reportType).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  RATE_LIMIT_REPORTS_PER_IP_PER_HOUR,
  RATE_LIMIT_REPORTS_PER_USER_PER_HOUR,
} from '@/constants/api-rate-limits';
import { z } from 'zod';
import { stripUnsafeTextControls } from '@/lib/security/sanitize';

const reportSchema = z.object({
  videoId: z.string().cuid(),
  reportType: z.enum(['FAKE_PERFORMANCE', 'COPYRIGHT', 'INAPPROPRIATE', 'OTHER']),
  details: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const ip = getClientIp(req);
    if (
      !(await checkRateLimit('report-ip', ip, RATE_LIMIT_REPORTS_PER_IP_PER_HOUR, 60 * 60 * 1000)) ||
      !(await checkRateLimit('report-user', user.id, RATE_LIMIT_REPORTS_PER_USER_PER_HOUR, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { ok: false, message: 'Too many reports submitted. Please try again later.' },
        { status: 429 }
      );
    }
    const body = await req.json();
    const parsed = reportSchema.parse(body);
    const details =
      parsed.details != null ? stripUnsafeTextControls(parsed.details).trim().slice(0, 1000) || null : null;

    const video = await prisma.video.findUnique({
      where: { id: parsed.videoId },
      select: { id: true, creatorId: true },
    });

    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    if (video.creatorId === user.id) {
      return NextResponse.json({ ok: false, message: 'You cannot report your own video' }, { status: 400 });
    }

    const existing = await prisma.contentReport.findUnique({
      where: {
        reporterId_videoId_reportType: {
          reporterId: user.id,
          videoId: parsed.videoId,
          reportType: parsed.reportType,
        },
      },
    });

    if (existing) {
      if (existing.status === 'PENDING' || existing.status === 'REVIEWING') {
        return NextResponse.json({ ok: true, message: 'Report already submitted' });
      }
      // Allow re-report if previously dismissed/resolved
    }

    await prisma.$transaction(async (tx) => {
      await tx.contentReport.upsert({
        where: {
          reporterId_videoId_reportType: {
            reporterId: user.id,
            videoId: parsed.videoId,
            reportType: parsed.reportType,
          },
        },
        create: {
          reporterId: user.id,
          videoId: parsed.videoId,
          reportType: parsed.reportType,
          details,
        },
        update: {
          details: details ?? undefined,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          resolution: null,
          updatedAt: new Date(),
        },
      });
      const count = await tx.contentReport.count({
        where: { videoId: parsed.videoId, status: { in: ['PENDING', 'REVIEWING'] } },
      });
      await tx.video.update({
        where: { id: parsed.videoId },
        data: { reportCount: count, isFlagged: count > 0 },
      });
    });

    return NextResponse.json({ ok: true, message: 'Report submitted. Our team will review it.' });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      const msg = e.errors[0]?.message ?? 'Invalid input';
      return NextResponse.json({ ok: false, message: msg, errors: e.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'Report failed' }, { status: 500 });
  }
}
