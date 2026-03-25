import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { totpEnableSchema } from '@/lib/validations';
import { verifyTotpCode, saveTotpEnabled } from '@/services/two-factor.service';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.user?.emailVerified) {
      return NextResponse.json({ ok: false, message: 'Verify your email first.' }, { status: 403 });
    }

    const body = await request.json();
    const { secret, code } = totpEnableSchema.parse(body);
    if (!verifyTotpCode(secret, code)) {
      return NextResponse.json({ ok: false, message: 'Code does not match this secret. Check the time on your device.' }, { status: 400 });
    }

    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });
    if (row?.twoFactorEnabled) {
      return NextResponse.json({ ok: false, message: 'Two-factor is already enabled.' }, { status: 400 });
    }

    await saveTotpEnabled(session.user.id, secret);
    await logAuthEvent('TWO_FACTOR_ENABLED', { userId: session.user.id, ip: getClientIp(request) });

    return NextResponse.json({ ok: true, message: 'Two-factor authentication is on.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'TWO_FACTOR_CRYPTO_NOT_CONFIGURED') {
      return NextResponse.json(
        { ok: false, message: 'Two-factor encryption is not configured on this server.' },
        { status: 503 }
      );
    }
    throw e;
  }
}
