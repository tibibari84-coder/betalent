import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';
import { verifyPassword } from '@/lib/password';
import { verifyTotpCode, getTotpSecretPlain, disableTotp } from '@/services/two-factor.service';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getClientIp } from '@/lib/rate-limit';

const disableSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password, code } = disableSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, twoFactorEnabled: true, twoFactorMethod: true },
    });
    if (!user?.twoFactorEnabled || user.twoFactorMethod !== 'TOTP') {
      return NextResponse.json({ ok: false, message: 'Authenticator is not enabled.' }, { status: 400 });
    }
    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: 'Invalid password.' }, { status: 401 });
    }

    const secret = await getTotpSecretPlain(session.user.id);
    if (!secret || !verifyTotpCode(secret, code)) {
      return NextResponse.json({ ok: false, message: 'Invalid authenticator code.' }, { status: 401 });
    }

    await disableTotp(session.user.id);
    await logAuthEvent('TWO_FACTOR_DISABLED', { userId: session.user.id, ip: getClientIp(request) });

    return NextResponse.json({ ok: true, message: 'Two-factor authentication is off.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'TWO_FACTOR_CRYPTO_NOT_CONFIGURED') {
      return NextResponse.json(
        { ok: false, message: 'Two-factor encryption is not configured on this server.' },
        { status: 503 }
      );
    }
    if (msg === 'TWO_FACTOR_SECRET_DECRYPT_FAILED') {
      return NextResponse.json(
        { ok: false, message: 'Two-factor secret is unreadable. Reconfigure authenticator.' },
        { status: 500 }
      );
    }
    throw e;
  }
}
