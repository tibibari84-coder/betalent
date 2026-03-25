import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateTotpSecret, buildTotpAuthUrl } from '@/services/two-factor.service';
import { assertTwoFactorCryptoConfigured } from '@/lib/runtime-config';

export async function GET() {
  try {
    assertTwoFactorCryptoConfigured();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Two-factor setup is not configured on this server.' },
      { status: 503 }
    );
  }
  const session = await getSession();
  if (!session.user?.emailVerified) {
    return NextResponse.json(
      { ok: false, message: 'Verify your email before enabling two-factor authentication.' },
      { status: 403 }
    );
  }
  if (session.pending2FAUserId) {
    return NextResponse.json({ ok: false, message: 'Complete sign-in first.' }, { status: 400 });
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildTotpAuthUrl(session.user.email, secret);

  return NextResponse.json({
    ok: true,
    secret,
    otpauthUrl,
  });
}
