import { getSession } from '@/lib/session';

type AppSession = Awaited<ReturnType<typeof getSession>>;

/**
 * Destroys the current sealed session cookie and returns a new empty iron-session instance.
 * Use before assigning a logged-in identity (mitigates session fixation; aligns with common IdP practice).
 */
export async function replaceSessionCookieWithFreshSession(): Promise<AppSession> {
  const current = await getSession();
  await current.destroy();
  return getSession();
}
