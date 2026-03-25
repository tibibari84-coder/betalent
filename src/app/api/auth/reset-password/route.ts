import { NextResponse } from 'next/server';
import { isPasswordPolicyExemptEmail, legacyPasswordRelaxed, resetPasswordRequestSchema, strongPassword } from '@/lib/validations';
import { getEmailForPasswordResetToken, resetPasswordWithToken } from '@/services/password-reset.service';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordRequestSchema.parse(body);
    const emailFromToken = await getEmailForPasswordResetToken(token);
    if (!emailFromToken) {
      return NextResponse.json(
        { ok: false, message: 'This reset link is invalid or has already been used.' },
        { status: 400 }
      );
    }
    const pwSchema = isPasswordPolicyExemptEmail(emailFromToken) ? legacyPasswordRelaxed : strongPassword;
    const pwParsed = pwSchema.safeParse(password);
    if (!pwParsed.success) {
      const msg = pwParsed.error.errors[0]?.message ?? 'Invalid password';
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
    const result = await resetPasswordWithToken(token, password);
    const ip = getClientIp(request);

    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'This reset link has expired. Request a new one from the sign-in page.'
          : 'This reset link is invalid or has already been used.';
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    await logAuthEvent('PASSWORD_RESET_COMPLETE', { userId: result.userId, ip });

    return NextResponse.json({ ok: true, message: 'Password updated. You can sign in now.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
