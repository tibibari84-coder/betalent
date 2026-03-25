const MAX_LEN = 2048;

/**
 * Safe internal path for post-login redirects. Rejects protocol-relative, host injection, and obvious URL schemes.
 */
export function sanitizeAppInternalRedirectPath(
  raw: string | null | undefined,
  fallback = '/feed'
): string {
  if (typeof raw !== 'string') return fallback;
  const t = raw.trim();
  if (!t || t.length > MAX_LEN) return fallback;
  if (!t.startsWith('/')) return fallback;
  if (t.startsWith('//')) return fallback;
  if (t.includes('\\')) return fallback;
  if (t.includes('@')) return fallback;
  const lower = t.toLowerCase();
  if (
    lower.startsWith('/javascript:') ||
    lower.startsWith('/data:') ||
    lower.startsWith('/vbscript:')
  ) {
    return fallback;
  }
  return t;
}
