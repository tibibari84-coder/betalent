import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getIronSessionOptions } from '@/lib/session-options';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role?: 'USER' | 'ADMIN';
  /** Preferred UI language (e.g. en, es, fr, hu). Applied after login. */
  locale?: string;
  /**
   * True when account email ownership is confirmed (emailVerifiedAt in DB).
   * Not legal identity — see product docs.
   */
  emailVerified: boolean;
}

export interface SessionData {
  user?: SessionUser;
  /** Password accepted; TOTP required to complete session. */
  pending2FAUserId?: string;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getIronSessionOptions());
}
