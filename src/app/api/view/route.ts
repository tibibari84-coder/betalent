/**
 * POST /api/view
 * Qualified public view: requires engagement payload; session cookie for anon dedup.
 * Body: { videoId, qualifiedWatchSeconds, durationSecondsClient?, source? }
 *
 * @see docs/VIEW-TRACKING.md
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { recordView, getClientIpFromHeaders, hashViewerIp } from '@/services/view-tracking.service';
import { z } from 'zod';

const VIEW_SESSION_COOKIE = 'betalent_sid';
const VIEW_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const bodySchema = z.object({
  videoId: z.string().min(1),
  qualifiedWatchSeconds: z.number().finite().min(0).max(86400),
  durationSecondsClient: z.number().finite().min(0).max(86400).optional(),
  source: z.enum(['feed', 'detail', 'modal']).optional(),
});

export async function POST(req: Request) {
  try {
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

    const result = await recordView(parsed.videoId, viewerKey, {
      viewerUserId: user?.id ?? null,
      qualifiedWatchSeconds: parsed.qualifiedWatchSeconds,
      viewerIpHash,
    });

    const res = NextResponse.json({
      ok: true,
      counted: result.counted,
      reason: result.reason,
    });
    if (setCookieHeader) res.headers.set('Set-Cookie', setCookieHeader);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: e.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: false, message: 'View record failed' }, { status: 500 });
  }
}
