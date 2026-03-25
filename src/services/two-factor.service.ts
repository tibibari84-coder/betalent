import { generateSecret, generateURI, verifySync } from 'otplib';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret, isAuthEncryptionConfigured } from '@/lib/crypto-app';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: 'BETALENT',
    label: email,
    secret,
  });
}

export function verifyTotpCode(secretPlain: string, code: string): boolean {
  const trimmed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(trimmed)) return false;
  try {
    return verifySync({
      secret: secretPlain,
      token: trimmed,
      epochTolerance: 30,
    }).valid;
  } catch {
    return false;
  }
}

export async function saveTotpEnabled(userId: string, secretPlain: string): Promise<void> {
  if (!isAuthEncryptionConfigured()) {
    throw new Error('TWO_FACTOR_CRYPTO_NOT_CONFIGURED');
  }
  const encrypted = encryptSecret(secretPlain);
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorMethod: 'TOTP',
      twoFactorSecretEncrypted: encrypted,
    },
  });
}

export async function getTotpSecretPlain(userId: string): Promise<string | null> {
  if (!isAuthEncryptionConfigured()) {
    throw new Error('TWO_FACTOR_CRYPTO_NOT_CONFIGURED');
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecretEncrypted: true, twoFactorEnabled: true, twoFactorMethod: true },
  });
  if (!u?.twoFactorEnabled || u.twoFactorMethod !== 'TOTP' || !u.twoFactorSecretEncrypted) return null;
  try {
    return decryptSecret(u.twoFactorSecretEncrypted);
  } catch {
    throw new Error('TWO_FACTOR_SECRET_DECRYPT_FAILED');
  }
}

export async function disableTotp(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorMethod: 'NONE',
      twoFactorSecretEncrypted: null,
    },
  });
}
