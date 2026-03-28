/**
 * Redact sensitive keys from log field objects (shallow + one-level nested).
 * Never log raw request bodies, cookies, or auth headers.
 */

const SENSITIVE_KEYS = new Set(
  [
    'password',
    'authorization',
    'cookie',
    'set-cookie',
    'secret',
    'token',
    'access_token',
    'refresh_token',
    'session',
    'credit',
    'card',
    'apikey',
    'api_key',
  ].map((k) => k.toLowerCase())
);

const MAX_STRING = 500;

function sanitizeValue(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === 'string') {
    const t = v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v;
    return t;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 20).map(sanitizeValue);
  if (typeof v === 'object') return '[object]';
  return String(v);
}

export function sanitizeLogFields(fields: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[redacted]';
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      const inner: Record<string, unknown> = {};
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        inner[ik] = SENSITIVE_KEYS.has(ik.toLowerCase()) ? '[redacted]' : sanitizeValue(iv);
      }
      out[k] = inner;
    } else {
      out[k] = sanitizeValue(v);
    }
  }
  return out;
}
