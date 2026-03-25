/**
 * BETALENT internal audio analysis – configurable limits and safety.
 * All values can be overridden via env. Worker uses same env names where applicable.
 *
 * Env: AUDIO_ANALYSIS_VERSION, AUDIO_ANALYSIS_MAX_RETRIES, AUDIO_ANALYSIS_MEDIA_FETCH_TIMEOUT_MS,
 * AUDIO_ANALYSIS_FFMPEG_TIMEOUT_MS, AUDIO_ANALYSIS_CALLBACK_TIMEOUT_MS, AUDIO_ANALYSIS_MAX_DURATION_SEC,
 * AUDIO_ANALYSIS_ANALYSIS_TIMEOUT_MS, AUDIO_WORKER_POLL_SEC, AUDIO_ANALYSIS_ALLOWED_DOMAINS.
 */

/** Current pipeline version; stored with each result for rescoring. */
export const ANALYSIS_VERSION = process.env.AUDIO_ANALYSIS_VERSION ?? '1.0';

/** Max attempts per job before marking FAILED (no more retries). */
export const MAX_ANALYSIS_ATTEMPTS = Math.max(1, parseInt(process.env.AUDIO_ANALYSIS_MAX_RETRIES ?? '3', 10));

/** Media fetch timeout (ms). */
export const MEDIA_FETCH_TIMEOUT_MS = Math.max(5000, parseInt(process.env.AUDIO_ANALYSIS_MEDIA_FETCH_TIMEOUT_MS ?? '90000', 10));

/** FFmpeg extraction timeout (ms). */
export const FFMPEG_TIMEOUT_MS = Math.max(10000, parseInt(process.env.AUDIO_ANALYSIS_FFMPEG_TIMEOUT_MS ?? '120000', 10));

/** Callback (result/failed) request timeout (ms). */
export const CALLBACK_TIMEOUT_MS = Math.max(5000, parseInt(process.env.AUDIO_ANALYSIS_CALLBACK_TIMEOUT_MS ?? '15000', 10));

/** Max media duration (seconds); reject longer media. */
export const MAX_MEDIA_DURATION_SEC = Math.max(60, parseInt(process.env.AUDIO_ANALYSIS_MAX_DURATION_SEC ?? '600', 10));

/** Librosa/analysis step timeout (ms). Worker should use same value in seconds. */
export const ANALYSIS_TIMEOUT_MS = Math.max(30000, parseInt(process.env.AUDIO_ANALYSIS_ANALYSIS_TIMEOUT_MS ?? '180000', 10));

/** Worker poll interval (seconds). Server does not poll; worker uses AUDIO_WORKER_POLL_SEC. */
export const WORKER_POLL_INTERVAL_SEC = Math.max(5, parseInt(process.env.AUDIO_WORKER_POLL_SEC ?? '15', 10));

/**
 * Media URL safety: do NOT process arbitrary public URLs.
 * Only approved internal or configured media domains are allowed (allowlist).
 * Rejects: invalid/empty URL, non-http(s) scheme, domain not in allowlist.
 * Reduces SSRF and abuse risk. Configure via AUDIO_ANALYSIS_ALLOWED_DOMAINS (comma-separated).
 */
const DEFAULT_ALLOWED_DOMAINS = [
  'res.cloudinary.com',
  'cloudinary.com',
  'localhost',
  '127.0.0.1',
  'r2.dev', // Cloudflare R2 public buckets (*.r2.dev)
  'r2.cloudflarestorage.com', // R2 S3 API endpoint
];

const ALLOWED_SCHEMES = ['http:', 'https:'] as const;

function getAllowedDomains(): string[] {
  const env = process.env.AUDIO_ANALYSIS_ALLOWED_DOMAINS;
  if (!env?.trim()) return DEFAULT_ALLOWED_DOMAINS;
  return env.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
}

let _allowedDomains: string[] | null = null;

export function getAllowedMediaDomains(): string[] {
  if (_allowedDomains === null) _allowedDomains = getAllowedDomains();
  return _allowedDomains;
}

export type MediaUrlValidation = { allowed: true } | { allowed: false; reason: string };

/**
 * Validates that a URL is safe for audio analysis: non-empty, http(s), host in allowlist.
 * Use for consistent rejection and logging. Prefer this when you need a reason (e.g. lastError).
 */
export function validateMediaUrlForAnalysis(url: string): MediaUrlValidation {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { allowed: false, reason: 'URL_EMPTY' };
  }
  try {
    const u = new URL(url.trim());
    if (!ALLOWED_SCHEMES.includes(u.protocol as (typeof ALLOWED_SCHEMES)[number])) {
      return { allowed: false, reason: 'URL_SCHEME_NOT_ALLOWED' };
    }
    const host = u.hostname.toLowerCase();
    const domains = getAllowedMediaDomains();
    if (!domains.length) return { allowed: false, reason: 'URL_ALLOWLIST_EMPTY' };
    const inList = domains.some((d) => host === d || host.endsWith('.' + d));
    if (!inList) return { allowed: false, reason: 'URL_NOT_ALLOWED' };
    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'URL_INVALID' };
  }
}

/** Returns true only if URL is valid, http(s), and host is in the allowlist. */
export function isAllowedMediaUrl(url: string): boolean {
  return validateMediaUrlForAnalysis(url).allowed;
}
