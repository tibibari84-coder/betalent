import { NextResponse } from 'next/server';
import { verifyEmailByToken } from '@/services/email-verification.service';
import { verifyEmailTokenSchema } from '@/lib/validations';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getSession } from '@/lib/session';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = verifyEmailTokenSchema.parse(body);
    const result = await verifyEmailByToken(token);
    const ip = getClientIp(request);

    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'This link has expired. Request a new verification email from your account.'
          : 'This verification link is invalid or has already been used.';
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    await logAuthEvent('EMAIL_VERIFIED', { userId: result.userId, ip });

    const session = await getSession();
    if (session.user?.id === result.userId) {
      session.user = { ...session.user, emailVerified: true };
      await session.save();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
