/**
 * Production view tracking: qualified engagement + deduplication + owner exclusion.
 *
 * Owner rule (Option A): Logged-in creator watching their own PUBLIC video does not increment viewsCount.
 * Anonymous sessions cannot be attributed as owner; canonical public gate still applies.
 *
 * @see docs/VIEW-TRACKING.md
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { getRequiredQualifiedWatchSeconds } from '@/lib/view-qualification';

/** At most one counted view per viewer key per video per 24h (session id or user id). Stops refresh spam & session churn within the day. */
const LONG_DEDUP_MS = 24 * 60 * 60 * 1000;

export interface RecordViewResult {
  counted: boolean;
  reason?: 'ineligible' | 'owner' | 'engagement' | 'dedup' | 'not_found';
}

export type RecordViewOptions = {
  viewerUserId?: string | null;
  /** Required for a count: seconds of playback client measured while video was actually playing & visible. */
  qualifiedWatchSeconds: number;
  viewerIpHash?: string | null;
};

export function hashViewerIp(ip: string | null | undefined): string | null {
  if (!ip || !ip.trim()) return null;
  const salt = process.env.VIEW_IP_SALT ?? 'betalent_view_ip_v1';
  return createHash('sha256').update(`${salt}:${ip.trim()}`).digest('hex').slice(0, 40);
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  return null;
}

/**
 * Record a qualified view: increments viewsCount only when engagement + dedup rules pass.
 */
export async function recordView(
  videoId: string,
  viewerKey: string,
  options: RecordViewOptions
): Promise<RecordViewResult> {
  const claimed = Number(options.qualifiedWatchSeconds);
  if (!Number.isFinite(claimed) || claimed < 0) {
    return { counted: false, reason: 'engagement' };
  }

  const video = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: { id: true, creatorId: true, durationSec: true },
  });
  if (!video) {
    return { counted: false, reason: 'not_found' };
  }

  if (options.viewerUserId && options.viewerUserId === video.creatorId) {
    return { counted: false, reason: 'owner' };
  }

  const required = getRequiredQualifiedWatchSeconds(video.durationSec);
  const durationCap = Math.max(video.durationSec, 1) + 2;
  const effectiveClaim = Math.min(claimed, durationCap);
  if (effectiveClaim < required) {
    return { counted: false, reason: 'engagement' };
  }

  const now = Date.now();
  const longSince = new Date(now - LONG_DEDUP_MS);
  const recentLong = await prisma.viewRecord.findFirst({
    where: { viewerKey, videoId, createdAt: { gte: longSince } },
    select: { id: true },
  });
  if (recentLong) {
    return { counted: false, reason: 'dedup' };
  }

  const qualifiedWatchSecRounded = Math.round(effectiveClaim);

  await prisma.$transaction(async (tx) => {
    await tx.viewRecord.create({
      data: {
        viewerKey,
        videoId,
        qualifiedWatchSec: qualifiedWatchSecRounded,
        viewerIpHash: options.viewerIpHash ?? null,
      },
    });
    await tx.video.update({
      where: { id: videoId },
      data: { viewsCount: { increment: 1 } },
    });
  });

  return { counted: true };
}
