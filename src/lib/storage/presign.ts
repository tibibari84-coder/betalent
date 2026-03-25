/**
 * Presigned URLs for direct upload (PUT) and playback (GET).
 * R2/S3-compatible; uses AWS SDK with custom endpoint.
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageConfig } from './config';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';

const DEFAULT_UPLOAD_EXPIRES = 60 * 60; // 1 hour
const DEFAULT_PLAYBACK_EXPIRES = 60 * 60 * 24; // 24 hours (when not using public URL)

/**
 * Synchronous public playback URL for a storage key. No AWS SDK calls.
 * Prefer this for R2 public buckets / custom domains so completion never fails on presigning GET.
 *
 * Reads `process.env.R2_PUBLIC_URL` first (always fresh in Node), then falls back to cached config.
 * Returns null if no public base is configured.
 */
export function buildPublicPlaybackUrl(storageKey: string): string | null {
  const fromEnv = process.env.R2_PUBLIC_URL?.trim();
  const fromConfig = getStorageConfig()?.publicBaseUrl?.trim();
  const raw = fromEnv || fromConfig || '';
  if (!raw) return null;
  const base = raw.replace(/\/$/, '');
  const key = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
  if (!key) return null;
  return `${base}/${key}`;
}

export type PresignedUploadResult = {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string; // ISO
};

export type PlaybackUrlResult = {
  url: string;
  expiresAt?: string; // when using presigned GET
};

/**
 * Get a presigned PUT URL for direct upload. Client uploads the file to this URL.
 */
export async function getPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds: number = DEFAULT_UPLOAD_EXPIRES
): Promise<PresignedUploadResult> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error('Storage not configured');
  }

  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
  const client = new S3Client(clientConfig);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return { uploadUrl, storageKey, expiresAt };
}

/**
 * Get playback URL for a stored video. Uses public base URL if set (env or config), else presigned GET.
 */
export async function getPlaybackUrl(
  storageKey: string,
  expiresInSeconds: number = DEFAULT_PLAYBACK_EXPIRES
): Promise<PlaybackUrlResult> {
  const publicUrl = buildPublicPlaybackUrl(storageKey);
  if (publicUrl) {
    return { url: publicUrl };
  }

  const config = getStorageConfig();
  if (!config) {
    throw new Error('Storage not configured');
  }

  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
  const client = new S3Client(clientConfig);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { url, expiresAt };
}
