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
import { recordView, hashViewerIp } from '@/services/view-tracking.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_VIEW_POST_PER_IP_PER_MINUTE } from '@/constants/api-rate-limits';
import { z } from 'zod';

const VIEW_SESSION_COOKIE = 'betalent_sid';
const VIEW_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const bodySchema = z.object({
  videoId: z.string().min(1).max(128),
  qualifiedWatchSeconds: z.number().finite().min(0).max(86400),
  durationSecondsClient: z.number().finite().min(0).max(86400).optional(),
  source: z.enum(['feed', 'detail', 'modal']).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit('view-post-ip', ip, RATE_LIMIT_VIEW_POST_PER_IP_PER_MINUTE, 60_000))) {
      return NextResponse.json({ ok: false, message: 'Too many view requests' }, { status: 429 });
    }

    const user = await getCurrentUser();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let sessionId = cookieStore.get(VIEW_SESSION_COOKIE)?.value;
    let setCookieHeader: string | undefined;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookieHeader = `${VIEW_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${VIEW_SESSION_MAX_AGE}`;
    }
    const viewerKey = user?.id ?? sessionId!;

    const viewerIpHash = hashViewerIp(ip);

    const result = await recordView(parsed.data.videoId, viewerKey, {
      viewerUserId: user?.id ?? null,
      qualifiedWatchSeconds: parsed.data.qualifiedWatchSeconds,
      viewerIpHash,
    });

    const res = NextResponse.json({
      ok: true,
      counted: result.counted,
      reason: result.reason,
    });
    if (setCookieHeader) res.headers.set('Set-Cookie', setCookieHeader);
    return res;
  } catch {
    return NextResponse.json({ ok: false, message: 'View record failed' }, { status: 500 });
  }
}
