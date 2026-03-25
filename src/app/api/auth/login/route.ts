import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { getSession } from '@/lib/session';
import { loginSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_LOGIN_ATTEMPTS_PER_ACCOUNT_PER_HOUR } from '@/constants/anti-cheat';
import { logAuthEvent } from '@/services/auth-audit.service';
import { sendNewLoginAlertEmail } from '@/services/new-login-alert.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent');
    if (!(await checkRateLimit('login-ip', ip, 30, 60 * 60 * 1000))) {
      return NextResponse.json({ ok: false, message: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    if (
      !(await checkRateLimit('login-account', email.toLowerCase(), RATE_LIMIT_LOGIN_ATTEMPTS_PER_ACCOUNT_PER_HOUR, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { ok: false, message: 'Too many login attempts for this account. Try again in an hour.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        passwordHash: true,
        preferredLocale: true,
        emailVerifiedAt: true,
        moderationStatus: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
      },
    });

    if (!user?.passwordHash) {
      await logAuthEvent('LOGIN_FAIL', { ip, userAgent: ua, meta: { reason: 'no_password_or_missing_user' } });
      return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logAuthEvent('LOGIN_FAIL', { userId: user.id, ip, userAgent: ua, meta: { reason: 'bad_password' } });
      return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
    }

    if (user.moderationStatus === 'SUSPENDED' || user.moderationStatus === 'BANNED') {
      await logAuthEvent('LOGIN_FAIL', { userId: user.id, ip, userAgent: ua, meta: { reason: 'moderation' } });
      return NextResponse.json(
        { ok: false, message: 'This account cannot sign in. Contact support if you believe this is an error.' },
        { status: 403 }
      );
    }

    const session = await getSession();
    const emailVerified = !!user.emailVerifiedAt;

    if (user.twoFactorEnabled && user.twoFactorMethod === 'TOTP') {
      session.user = undefined;
      session.pending2FAUserId = user.id;
      await session.save();
      await logAuthEvent('LOGIN_SUCCESS', {
        userId: user.id,
        ip,
        userAgent: ua,
        meta: { step: 'password_ok_pending_totp' },
      });
      return NextResponse.json({
        ok: true,
        needs2FA: true,
        user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
      });
    }

    session.pending2FAUserId = undefined;
    session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified,
      ...(user.preferredLocale != null && { locale: user.preferredLocale }),
    };
    await session.save();

    await logAuthEvent('LOGIN_SUCCESS', { userId: user.id, ip, userAgent: ua });

    void sendNewLoginAlertEmail({
      userId: user.id,
      email: user.email,
      displayName: user.displayName?.trim() || user.username,
      preferredLocale: user.preferredLocale,
      ip,
      userAgent: ua,
      method: 'password',
    }).catch((e) => console.warn('[login] new-login alert email', e));

    return NextResponse.json({
      ok: true,
      needs2FA: false,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    const msg = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
