import { prisma } from '@/lib/prisma';
import { appBaseUrl, passwordResetEmailContent, sendTransactionalEmail } from '@/lib/email';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/auth-tokens';
import { hashPassword } from '@/lib/password';

const RESET_TTL_MS = 60 * 60 * 1000;

/** Always returns success to caller (anti-enumeration); logs internally if no user. */
export async function requestPasswordReset(email: string, ip: string | null): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' } },
    select: { id: true, email: true, displayName: true },
  });
  if (!user) return;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  const base = appBaseUrl();
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;
  const { subject, text, html } = passwordResetEmailContent(resetUrl, user.displayName);
  await sendTransactionalEmail({ to: user.email, subject, text, html });
}

/** Resolve user email for a valid, non-expired reset token (for password policy). */
export async function getEmailForPasswordResetToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashOpaqueToken(rawToken);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: { select: { email: true } } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.user.email;
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'expired' }> {
  const tokenHash = hashOpaqueToken(rawToken);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  });
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: row.id } });
    return { ok: false, reason: 'expired' };
  }
  const userId = row.userId;
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
  return { ok: true, userId };
}
