import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  RATE_LIMIT_VERIFICATION_RESEND_PER_IP_PER_HOUR,
  RATE_LIMIT_VERIFICATION_RESEND_PER_USER_PER_HOUR,
} from '@/constants/anti-cheat';
import { sendVerificationEmailForUser } from '@/services/email-verification.service';
import { logAuthEvent } from '@/services/auth-audit.service';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit('verify-resend-ip', ip, RATE_LIMIT_VERIFICATION_RESEND_PER_IP_PER_HOUR, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, message: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ ok: false, message: 'Sign in to resend verification.' }, { status: 401 });
  }

  if (!(await checkRateLimit('verify-resend-user', session.user.id, RATE_LIMIT_VERIFICATION_RESEND_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, message: 'Too many resend attempts. Try again in an hour.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Account not found.' }, { status: 404 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, message: 'Email is already verified.' });
  }

  const sent = await sendVerificationEmailForUser(user.id, user.email, user.displayName);
  await logAuthEvent('VERIFICATION_RESENT', { userId: user.id, ip });

  if (!sent) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'We could not send email right now. If you are the operator, configure RESEND_API_KEY or check logs in development.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, message: 'Verification email sent.' });
}
