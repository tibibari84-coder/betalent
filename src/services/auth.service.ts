import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import type { RegisterInput } from '@/lib/validations';
import { hashPassword } from '@/lib/password';
import { appBaseUrl, sendTransactionalEmail, verificationEmailContent } from '@/lib/email';
import { createEmailVerificationToken } from '@/services/email-verification.service';

export { hashPassword, verifyPassword } from '@/lib/password';

export async function register(input: RegisterInput) {
  const parsed = registerSchema.parse(input);

  const existingEmail = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existingEmail) throw new Error('CONFLICT_ACCOUNT');

  const existingUsername = await prisma.user.findUnique({ where: { username: parsed.username } });
  if (existingUsername) throw new Error('CONFLICT_ACCOUNT');

  let referrerId: string | null = null;
  if (parsed.referrerId) {
    const referrer = await prisma.user.findUnique({
      where: { id: parsed.referrerId },
      select: { id: true },
    });
    if (referrer) referrerId = referrer.id;
  }

  const passwordHash = await hashPassword(parsed.password);

  const preferredLocale = parsed.preferredLocale ?? 'en';
  const normalizedCountryCode =
    parsed.countryCode?.trim().toUpperCase() ||
    parsed.country?.trim().toUpperCase() ||
    null;

  const now = new Date();
  const { user, rawToken } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const u = await tx.user.create({
      data: {
        email: parsed.email,
        username: parsed.username,
        passwordHash,
        displayName: parsed.displayName,
        country: normalizedCountryCode,
        talentType: parsed.talentType ?? null,
        preferredLocale,
        creatorTier: 'STARTER',
        uploadLimitSec: 90,
        fairPlayPolicyAcceptedAt: now,
        acceptedTermsAt: parsed.termsAccepted ? now : null,
        referrerId,
        emailVerifiedAt: null,
      },
    });
    await tx.userWallet.create({
      data: { userId: u.id },
    });
    if (referrerId) {
      await tx.referral.create({
        data: {
          referrerId,
          referredUserId: u.id,
        },
      });
    }
    const { rawToken: token } = await createEmailVerificationToken(tx, u.id);
    return { user: u, rawToken: token };
  });

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const { subject, text, html } = verificationEmailContent(verifyUrl, user.displayName);
  const emailResult = await sendTransactionalEmail({ to: user.email, subject, text, html });

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      preferredLocale: user.preferredLocale ?? 'en',
    },
    verificationEmailSent: emailResult.ok,
  };
}
