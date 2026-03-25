import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/services/auth.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isPasswordPolicyExemptEmail, legacyPasswordRelaxed, strongPassword } from '@/lib/validations';
import { z } from 'zod';

const passwordChangeBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit('password-change-ip', ip, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { ok: false, message: 'Too many password change attempts. Try again in an hour.' },
      { status: 429 }
    );
  }

  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = passwordChangeBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid request';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, email: true },
  });
  if (!dbUser) {
    return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });
  }

  if (!dbUser.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'This account has no password yet. Use “Forgot password” on the sign-in page to set one, or continue with Google.',
      },
      { status: 400 }
    );
  }

  const pwSchema = isPasswordPolicyExemptEmail(dbUser.email) ? legacyPasswordRelaxed : strongPassword;
  const pwParsed = pwSchema.safeParse(newPassword);
  if (!pwParsed.success) {
    const msg = pwParsed.error.errors[0]?.message ?? 'Invalid password';
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: 'Current password is incorrect' }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
