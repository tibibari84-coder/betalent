/**
 * Production AUTH_ENCRYPTION_KEY validation and 32-byte key material.
 * Uses Buffer only (no `import 'crypto'`) so Next can bundle instrumentation → runtime-config without webpack "Can't resolve 'crypto'".
 */

const KEY_LEN = 32;

function deriveProductionAuthKeyBufferFromEnv(): Buffer {
  const raw = process.env.AUTH_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      'TWO_FACTOR_CRYPTO_NOT_CONFIGURED: AUTH_ENCRYPTION_KEY is missing. Required whenever NODE_ENV=production (e.g. `npm run start`, load tests, Vercel). Generate: openssl rand -base64 32'
    );
  }
  if (raw.length >= 32) {
    try {
      const buf = Buffer.from(raw, 'base64');
      if (buf.length === KEY_LEN) return buf;
    } catch {
      /* try hex */
    }
  }
  if (raw.length >= 64) {
    const buf = Buffer.from(raw.slice(0, 64), 'hex');
    if (buf.length === KEY_LEN) return buf;
  }
  throw new Error(
    'TWO_FACTOR_CRYPTO_NOT_CONFIGURED: AUTH_ENCRYPTION_KEY must decode to exactly 32 bytes (recommended: `openssl rand -base64 32`, or 64 hex characters).'
  );
}

let cachedProductionKey: Buffer | null = null;

/** Cached 32-byte key for AES-256-GCM (production only). */
export function getProductionAuthEncryptionKeyBuffer(): Buffer {
  if (!cachedProductionKey) {
    cachedProductionKey = deriveProductionAuthKeyBufferFromEnv();
  }
  return cachedProductionKey;
}

/**
 * Fail fast on production boot (instrumentation). Same rules as 2FA encrypt/decrypt.
 */
export function assertProductionAuthEncryptionKey(): void {
  if (process.env.NODE_ENV !== 'production') return;
  getProductionAuthEncryptionKeyBuffer();
}
