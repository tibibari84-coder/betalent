import { getSession } from './session';
import type { SessionUser } from './session';
import { prisma } from '@/lib/prisma';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (session.pending2FAUserId && !session.user) return null;
  return session.user ?? null;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.user || session.pending2FAUserId) throw new Error('Unauthorized');
  return session.user;
}

/**
 * Requires authenticated session and email ownership verification (emailVerifiedAt).
 * Does not imply legal/creator identity — use creator verification flows separately.
 */
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.emailVerified) throw new Error('Email not verified');
  return user;
}

/** Load email verification flag from DB and align session (call after verify-email in same browser). */
export async function refreshSessionEmailVerifiedFromDb(): Promise<void> {
  const session = await getSession();
  if (!session.user) return;
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true },
  });
  if (!row) return;
  session.user = { ...session.user, emailVerified: !!row.emailVerifiedAt };
  await session.save();
}

/** Requires authenticated user with role ADMIN. Use in admin-only API routes. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}
