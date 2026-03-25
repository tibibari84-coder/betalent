/**
 * Object storage config (Cloudflare R2 / S3-compatible).
 * Set env vars for production; optional for dev (direct upload disabled when unset).
 */

export type StorageConfig = {
  provider: 'r2';
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL for playback (e.g. https://pub-xxx.r2.dev or custom domain). Empty = use presigned GET. */
  publicBaseUrl: string | null;
  /** S3-compatible endpoint (R2: https://<accountId>.r2.cloudflarestorage.com) */
  endpoint: string;
  region: string;
};

function getConfig(): StorageConfig | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_URL?.trim() || null;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    provider: 'r2',
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
  };
}

let cached: StorageConfig | null | undefined = undefined;

export function getStorageConfig(): StorageConfig | null {
  if (cached === undefined) {
    cached = getConfig();
  }
  return cached;
}

export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}

/** Storage key prefix for video objects. */
export const VIDEO_KEY_PREFIX = 'videos/';
/** Storage key prefix for thumbnail images. */
export const THUMBNAIL_KEY_PREFIX = 'thumbnails/';
/** Storage key prefix for avatar images. */
export const AVATAR_KEY_PREFIX = 'avatars/';
