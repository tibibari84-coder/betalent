import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  RATE_LIMIT_PASSWORD_RESET_PER_EMAIL_PER_HOUR,
  RATE_LIMIT_PASSWORD_RESET_PER_IP_PER_HOUR,
} from '@/constants/anti-cheat';
import { requestPasswordReset } from '@/services/password-reset.service';
import { logAuthEvent } from '@/services/auth-audit.service';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit('pwd-reset-ip', ip, RATE_LIMIT_PASSWORD_RESET_PER_IP_PER_HOUR, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, message: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);
    const key = email.toLowerCase();
    if (!(await checkRateLimit('pwd-reset-email', key, RATE_LIMIT_PASSWORD_RESET_PER_EMAIL_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json({
        ok: true,
        message: 'If an account exists for that email, we sent reset instructions.',
      });
    }

    await requestPasswordReset(email, ip);
    await logAuthEvent('PASSWORD_RESET_REQUEST', { ip, meta: { normalizedEmail: key } });

    return NextResponse.json({
      ok: true,
      message: 'If an account exists for that email, we sent reset instructions.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
