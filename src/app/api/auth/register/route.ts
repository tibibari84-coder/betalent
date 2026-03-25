import { NextResponse } from 'next/server';
import { register as registerUser } from '@/services/auth.service';
import { getSession } from '@/lib/session';
import { registerSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_SIGNUP_ATTEMPTS_PER_IP_PER_HOUR } from '@/constants/anti-cheat';
import { logAuthEvent } from '@/services/auth-audit.service';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent');
    if (!(await checkRateLimit('register-ip', ip, RATE_LIMIT_SIGNUP_ATTEMPTS_PER_IP_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json(
        { ok: false, message: 'Too many signup attempts from this device. Try again in an hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    let parsed = registerSchema.parse(body);
    const session = await getSession();
    if (parsed.referrerId && session?.user?.id && session.user.id === parsed.referrerId) {
      parsed = { ...parsed, referrerId: undefined };
    }
    const { user, verificationEmailSent } = await registerUser(parsed);

    const sess = await getSession();
    sess.pending2FAUserId = undefined;
    sess.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      ...(user.preferredLocale != null && { locale: user.preferredLocale }),
      emailVerified: false,
    };
    await sess.save();

    await logAuthEvent('REGISTER_EMAIL', { userId: user.id, ip, userAgent: ua });

    return NextResponse.json({
      ok: true,
      user,
      verificationEmailSent,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Registration failed';
    if (message === 'CONFLICT_ACCOUNT') {
      return NextResponse.json(
        {
          ok: false,
          message:
            'We could not create an account with these details. The email or username may already be in use.',
        },
        { status: 409 }
      );
    }
    const status = message.includes('already') ? 409 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
