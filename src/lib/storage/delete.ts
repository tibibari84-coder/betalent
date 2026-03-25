import { DeleteObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getStorageConfig, VIDEO_KEY_PREFIX, THUMBNAIL_KEY_PREFIX, AVATAR_KEY_PREFIX } from './config';

const ALLOWED_PREFIXES = [VIDEO_KEY_PREFIX, THUMBNAIL_KEY_PREFIX, AVATAR_KEY_PREFIX];

function isAllowedStorageKey(key: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function normalizeStorageKey(raw: string): string | null {
  const cleaned = decodeURIComponent(raw.trim().replace(/^\/+/, ''));
  if (!cleaned) return null;
  return isAllowedStorageKey(cleaned) ? cleaned : null;
}

function createClient() {
  const config = getStorageConfig();
  if (!config) return null;
  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
  return { client: new S3Client(clientConfig), config };
}

/**
 * Best-effort extraction of a storage key from playback/public URL.
 * Returns null when the URL is not confidently mappable to a known storage prefix.
 */
export function extractStorageKeyFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const config = getStorageConfig();
    if (config?.publicBaseUrl) {
      const base = config.publicBaseUrl.replace(/\/+$/, '');
      if (trimmed.startsWith(`${base}/`)) {
        return normalizeStorageKey(trimmed.slice(base.length + 1));
      }
    }

    const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!path) return null;

    // R2/S3 path-style URLs are commonly /bucket/key
    if (config?.bucket && path.startsWith(`${config.bucket}/`)) {
      return normalizeStorageKey(path.slice(config.bucket.length + 1));
    }

    const direct = normalizeStorageKey(path);
    if (direct) return direct;

    // Historical/edge URL patterns may prepend route segments before the storage key.
    for (const prefix of ALLOWED_PREFIXES) {
      const idx = path.indexOf(prefix);
      if (idx >= 0) {
        const candidate = normalizeStorageKey(path.slice(idx));
        if (candidate) return candidate;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function deleteStorageObject(storageKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeStorageKey(storageKey);
  if (!normalized) {
    return { ok: false, error: 'Invalid or unsupported storage key' };
  }
  const ctx = createClient();
  if (!ctx) {
    return { ok: false, error: 'Storage not configured' };
  }
  try {
    await ctx.client.send(
      new DeleteObjectCommand({
        Bucket: ctx.config.bucket,
        Key: normalized,
      })
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteStorageObjects(storageKeys: string[]): Promise<{
  deleted: string[];
  failed: Array<{ key: string; error: string }>;
}> {
  const unique = Array.from(new Set(storageKeys.map((k) => k.trim()).filter(Boolean)));
  const deleted: string[] = [];
  const failed: Array<{ key: string; error: string }> = [];
  for (const key of unique) {
    const res = await deleteStorageObject(key);
    if (res.ok) deleted.push(key);
    else failed.push({ key, error: res.error });
  }
  return { deleted, failed };
}

export async function neutralizeStorageObject(storageKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeStorageKey(storageKey);
  if (!normalized) {
    return { ok: false, error: 'Invalid or unsupported storage key' };
  }
  const ctx = createClient();
  if (!ctx) {
    return { ok: false, error: 'Storage not configured' };
  }

  const body =
    normalized.startsWith(THUMBNAIL_KEY_PREFIX) || normalized.startsWith(AVATAR_KEY_PREFIX)
      ? Buffer.from(
          // 1x1 transparent png
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5w5fQAAAAASUVORK5CYII=',
          'base64'
        )
      : Buffer.from('removed');
  const contentType =
    normalized.startsWith(THUMBNAIL_KEY_PREFIX) || normalized.startsWith(AVATAR_KEY_PREFIX)
      ? 'image/png'
      : 'text/plain';
  try {
    await ctx.client.send(
      new PutObjectCommand({
        Bucket: ctx.config.bucket,
        Key: normalized,
        Body: body,
        ContentType: contentType,
        CacheControl: 'no-store, max-age=0',
      })
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function ensureStorageObjectsRemovedOrNeutralized(storageKeys: string[]): Promise<{
  deleted: string[];
  neutralized: string[];
  failed: Array<{ key: string; error: string }>;
}> {
  const { deleted, failed } = await deleteStorageObjects(storageKeys);
  const neutralized: string[] = [];
  const unresolved: Array<{ key: string; error: string }> = [];
  for (const item of failed) {
    const fallback = await neutralizeStorageObject(item.key);
    if (fallback.ok) {
      neutralized.push(item.key);
      console.warn('[storage-delete] delete failed, object neutralized', {
        key: item.key,
        deleteError: item.error,
      });
    } else {
      unresolved.push({ key: item.key, error: `${item.error}; neutralize failed: ${fallback.error}` });
    }
  }
  return { deleted, neutralized, failed: unresolved };
}
