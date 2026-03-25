import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { getProductionAuthEncryptionKeyBuffer } from '@/lib/auth-encryption-key';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function isStrictProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isAuthEncryptionConfigured(): boolean {
  const raw = process.env.AUTH_ENCRYPTION_KEY?.trim();
  if (!isStrictProduction()) return true;
  return !!raw;
}

function getKey(): Buffer {
  if (isStrictProduction()) {
    return getProductionAuthEncryptionKeyBuffer();
  }
  const raw = process.env.AUTH_ENCRYPTION_KEY?.trim();
  if (raw && raw.length >= 32) {
    try {
      const buf = Buffer.from(raw, 'base64');
      if (buf.length === KEY_LEN) return buf;
    } catch {
      /* fall through */
    }
    if (raw.length >= 64) {
      const buf = Buffer.from(raw.slice(0, 64), 'hex');
      if (buf.length === KEY_LEN) return buf;
    }
  }
  const secret = process.env.SESSION_SECRET ?? 'dev-only-encryption-key-change-me';
  return scryptSync(secret, 'betalent-2fa-salt', KEY_LEN);
}

/** Encrypt small strings (e.g. TOTP shared secret). Returns base64(iv+ciphertext+tag). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64');
}

export function decryptSecret(payloadB64: string): string {
  const key = getKey();
  const buf = Buffer.from(payloadB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const data = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Re-export for API routes that should fail with the same message as boot. */
export { assertProductionAuthEncryptionKey } from '@/lib/auth-encryption-key';
