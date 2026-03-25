/**
 * GET /api/share/url?resourceType=video|profile&resourceId=<id>
 * Returns shareable URL with optional ref=userId for referral attribution.
 * When user is authenticated, appends ?ref=userId (or &ref= if URL already has params).
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { ok: false, message: 'resourceType and resourceId required' },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);
    let path: string;

    if (resourceType === 'video') {
      const video = await prisma.video.findFirst({
        where: { id: resourceId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
        select: { id: true },
      });
      if (!video) {
        return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
      }
      path = `/video/${resourceId}`;
    } else if (resourceType === 'profile') {
      const user = await prisma.user.findUnique({
        where: { username: resourceId },
        select: { username: true },
      });
      if (!user) {
        return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
      }
      path = `/profile/${resourceId}`;
    } else {
      return NextResponse.json(
        { ok: false, message: 'resourceType must be video or profile' },
        { status: 400 }
      );
    }

    let shareUrl = `${baseUrl}${path}`;
    const user = await getCurrentUser();
    if (user?.id) {
      shareUrl += `${path.includes('?') ? '&' : '?'}ref=${encodeURIComponent(user.id)}`;
    }

    return NextResponse.json({ ok: true, shareUrl });
  } catch (e) {
    console.error('[share/url]', e);
    return NextResponse.json({ ok: false, message: 'Failed to build share URL' }, { status: 500 });
  }
}
