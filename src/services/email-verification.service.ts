import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { appBaseUrl, sendTransactionalEmail, verificationEmailContent } from '@/lib/email';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/auth-tokens';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<{ rawToken: string }> {
  await tx.emailVerificationToken.deleteMany({ where: { userId } });
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  await tx.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return { rawToken };
}

export async function sendVerificationEmailForUser(userId: string, email: string, displayName: string): Promise<boolean> {
  const { rawToken } = await prisma.$transaction(async (tx) => createEmailVerificationToken(tx, userId));
  const base = appBaseUrl();
  const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const { subject, text, html } = verificationEmailContent(verifyUrl, displayName);
  const result = await sendTransactionalEmail({ to: email, subject, text, html });
  return result.ok;
}

export async function verifyEmailByToken(rawToken: string): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const tokenHash = hashOpaqueToken(rawToken);
  const row = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
    include: { user: { select: { id: true, emailVerifiedAt: true } } },
  });
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: row.id } });
    return { ok: false, reason: 'expired' };
  }
  if (row.user.emailVerifiedAt) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } });
    return { ok: true, userId: row.userId };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { ok: true, userId: row.userId };
}
