/**
 * Google OAuth account resolution and linking.
 * See docs/AUTH_GOOGLE_LINKING.md for conflict rules.
 */

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

function slugFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  return local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || 'user';
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${base}_${randomBytes(3).toString('hex')}`;
  }
  return `${base}_${randomBytes(6).toString('hex')}`;
}

type SessionUserRow = {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  preferredLocale: string | null;
  emailVerifiedAt: Date | null;
};

/**
 * Find or create user from Google; apply linking rules.
 * Requires Google's email_verified — we do not onboard unverified Google emails.
 */
export async function resolveGoogleUser(profile: GoogleProfile): Promise<{ user: SessionUserRow; linked: boolean }> {
  if (!profile.emailVerified) {
    throw new Error('GOOGLE_EMAIL_UNVERIFIED');
  }

  const byGoogle = await prisma.user.findUnique({
    where: { googleId: profile.sub },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      preferredLocale: true,
      emailVerifiedAt: true,
    },
  });
  if (byGoogle) {
    return { user: byGoogle, linked: false };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      preferredLocale: true,
      emailVerifiedAt: true,
      googleId: true,
    },
  });

  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw new Error('GOOGLE_ACCOUNT_CONFLICT');
    }
    const newVerified = byEmail.emailVerifiedAt ?? new Date();
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.sub,
        emailVerifiedAt: newVerified,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        preferredLocale: true,
        emailVerifiedAt: true,
      },
    });
    return { user: updated, linked: true };
  }

  const base = slugFromEmail(profile.email);
  const username = await uniqueUsername(base);
  const displayName = profile.name?.trim() || username;
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: profile.email,
        username,
        displayName,
        passwordHash: null,
        googleId: profile.sub,
        emailVerifiedAt: now,
        avatarUrl: profile.picture ?? null,
        preferredLocale: 'en',
        creatorTier: 'STARTER',
        uploadLimitSec: 90,
        fairPlayPolicyAcceptedAt: now,
        acceptedTermsAt: now,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        preferredLocale: true,
        emailVerifiedAt: true,
      },
    });
    await tx.userWallet.create({ data: { userId: u.id } });
    return u;
  });

  return { user: created, linked: false };
}
