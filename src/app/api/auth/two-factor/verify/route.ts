import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { totpVerifySchema } from '@/lib/validations';
import { verifyTotpCode, getTotpSecretPlain } from '@/services/two-factor.service';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.pending2FAUserId) {
      return NextResponse.json({ ok: false, message: 'No sign-in is waiting for a security code.' }, { status: 400 });
    }

    const body = await request.json();
    const { code } = totpVerifySchema.parse(body);
    const userId = session.pending2FAUserId;
    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent');

    const secret = await getTotpSecretPlain(userId);
    if (!secret || !verifyTotpCode(secret, code)) {
      await logAuthEvent('TWO_FACTOR_CHALLENGE_FAIL', { userId, ip, userAgent: ua });
      return NextResponse.json({ ok: false, message: 'Invalid code. Try again.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        preferredLocale: true,
        emailVerifiedAt: true,
        moderationStatus: true,
      },
    });
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Account not found.' }, { status: 404 });
    }
    if (user.moderationStatus === 'SUSPENDED' || user.moderationStatus === 'BANNED') {
      return NextResponse.json({ ok: false, message: 'This account cannot sign in.' }, { status: 403 });
    }

    session.pending2FAUserId = undefined;
    session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified: !!user.emailVerifiedAt,
      ...(user.preferredLocale != null && { locale: user.preferredLocale }),
    };
    await session.save();

    await logAuthEvent('LOGIN_SUCCESS', { userId, ip, userAgent: ua, meta: { step: 'totp_complete' } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request';
    if (msg === 'TWO_FACTOR_CRYPTO_NOT_CONFIGURED') {
      return NextResponse.json(
        { ok: false, message: 'Two-factor verification is not configured on this server.' },
        { status: 503 }
      );
    }
    if (msg === 'TWO_FACTOR_SECRET_DECRYPT_FAILED') {
      return NextResponse.json(
        { ok: false, message: 'Two-factor secret is unreadable. Reconfigure authenticator.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
