/**
 * POST /api/videos/[id]/view
 * Same qualified-view contract as POST /api/view (body required).
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { recordView, getClientIpFromHeaders, hashViewerIp } from '@/services/view-tracking.service';
import { z } from 'zod';

const VIEW_SESSION_COOKIE = 'betalent_sid';
const VIEW_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const bodySchema = z.object({
  qualifiedWatchSeconds: z.number().finite().min(0).max(86400),
  durationSecondsClient: z.number().finite().min(0).max(86400).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const videoId = params.id;
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    const cookieStore = await cookies();
    let sessionId = cookieStore.get(VIEW_SESSION_COOKIE)?.value;
    let setCookieHeader: string | undefined;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookieHeader = `${VIEW_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${VIEW_SESSION_MAX_AGE}`;
    }
    const viewerKey = user?.id ?? sessionId!;

    const ip = getClientIpFromHeaders(req.headers);
    const viewerIpHash = hashViewerIp(ip);

    const result = await recordView(videoId, viewerKey, {
      viewerUserId: user?.id ?? null,
      qualifiedWatchSeconds: parsed.qualifiedWatchSeconds,
      viewerIpHash,
    });

    const res = NextResponse.json({ ok: true, counted: result.counted, reason: result.reason });
    if (setCookieHeader) res.headers.set('Set-Cookie', setCookieHeader);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError(400, 'Invalid body', { code: 'VALIDATION_ERROR', errors: e.flatten() });
    }
    return apiError(500, 'View tracking failed', { code: 'VIEW_TRACK_FAILED' });
  }
}
