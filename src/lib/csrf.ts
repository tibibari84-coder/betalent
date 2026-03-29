/**
 * Double-submit CSRF: cookie `betalent_csrf` + header `x-csrf-token` must match.
 * Cookie is not httpOnly so same-origin JS can mirror it into the header (standard pattern).
 */

export const CSRF_COOKIE_NAME = 'betalent_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function getCsrfTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const s = p.trim();
    if (!s.startsWith(`${CSRF_COOKIE_NAME}=`)) continue;
    return decodeURIComponent(s.slice(CSRF_COOKIE_NAME.length + 1).trim());
  }
  return null;
}
