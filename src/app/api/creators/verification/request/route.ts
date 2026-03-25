import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requestVerification } from '@/services/creator-verification.service';
import { z } from 'zod';

const bodySchema = z.object({
  socialLinks: z.array(z.string().url()).optional(),
  portfolioLinks: z.array(z.string().url()).optional(),
  musicPlatformLinks: z.array(z.string().url()).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/creators/verification/request
 * Submit or update a verification request (payload optional). Creates/updates to PENDING.
 */
export async function POST(req: Request) {
  let user: { id: string };
  try {
    user = await requireAuth();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ ok: false, message: msg }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  const payload = parsed.success
    ? {
        socialLinks: parsed.data.socialLinks,
        portfolioLinks: parsed.data.portfolioLinks,
        musicPlatformLinks: parsed.data.musicPlatformLinks,
        notes: parsed.data.notes,
      }
    : undefined;

  try {
    const result = await requestVerification(user.id, payload);
    return NextResponse.json({ ok: true, id: result.id, status: result.status });
  } catch (e) {
    console.error('[creators/verification/request]', e);
    return NextResponse.json({ ok: false, message: 'Request failed' }, { status: 500 });
  }
}
