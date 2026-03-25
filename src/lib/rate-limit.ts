/**
 * Rate limiter for API routes. Uses DB (Prisma) when available; falls back to in-memory.
 * Survives restarts when DB is used. WAF / Cloudflare recommended for DDoS.
 */

import { prisma } from '@/lib/prisma';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

function memoryCleanup() {
  const now = Date.now();
  Array.from(memoryStore.entries()).forEach(([k, v]) => {
    if (v.resetAt < now) memoryStore.delete(k);
  });
}

if (typeof setInterval !== 'undefined') {
  setInterval(memoryCleanup, 60_000);
}

function checkRateLimitMemory(prefix: string, id: string, limit: number, windowMs: number): boolean {
  const key = getKey(prefix, id);
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Check rate limit using DB. Returns true if allowed, false if exceeded.
 * Falls back to in-memory when DB fails.
 */
async function checkRateLimitDb(prefix: string, id: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { prefix_identifier: { prefix, identifier: id } },
    });

    if (!existing) {
      await prisma.rateLimit.create({
        data: { prefix, identifier: id, count: 1, resetAt },
      });
      return true;
    }

    if (existing.resetAt.getTime() < now) {
      await prisma.rateLimit.update({
        where: { prefix_identifier: { prefix, identifier: id } },
        data: { count: 1, resetAt },
      });
      return true;
    }

    if (existing.count >= limit) return false;

    await prisma.rateLimit.update({
      where: { prefix_identifier: { prefix, identifier: id } },
      data: { count: existing.count + 1 },
    });
    return true;
  } catch {
    return checkRateLimitMemory(prefix, id, limit, windowMs);
  }
}

/**
 * Check rate limit. Returns true if allowed, false if exceeded.
 * Uses DB when available; falls back to in-memory on error.
 * @param prefix e.g. 'login-ip', 'register-ip', 'login-account'
 * @param id e.g. IP address or email
 * @param limit max requests per window
 * @param windowMs window in milliseconds
 */
export async function checkRateLimit(
  prefix: string,
  id: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  return checkRateLimitDb(prefix, id, limit, windowMs);
}

/**
 * Get client IP from request (Vercel, Cloudflare, or x-forwarded-for).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
