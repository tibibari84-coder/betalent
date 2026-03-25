/**
 * Server-side upload of generated assets (e.g. thumbnails, processed video).
 * Uses S3 PutObject; returns public or presigned URL.
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { getStorageConfig } from './config';
import { buildThumbnailStorageKey, buildVideoStorageKey, buildAvatarStorageKey } from './keys';
import { getPlaybackUrl } from './presign';
import type { S3ClientConfig } from '@aws-sdk/client-s3';

const DEFAULT_THUMBNAIL_EXPIRES = 60 * 60 * 24 * 365; // 1 year for GET

export type UploadThumbnailResult = {
  url: string;
  storageKey: string;
};

/**
 * Upload thumbnail image buffer to storage and return the URL.
 * Key: thumbnails/{userId}/{videoId}.jpg
 */
export async function uploadThumbnail(
  userId: string,
  videoId: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<UploadThumbnailResult> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error('Storage not configured');
  }

  const storageKey = buildThumbnailStorageKey(userId, videoId);

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

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const { url } = await getPlaybackUrl(storageKey, DEFAULT_THUMBNAIL_EXPIRES);
  return { url, storageKey };
}

const DEFAULT_AVATAR_EXPIRES = 60 * 60 * 24 * 365; // 1 year for GET

export type UploadAvatarResult = {
  url: string;
  storageKey: string;
};

/**
 * Upload avatar image buffer to R2 and return the URL.
 * Key: avatars/{userId}/{uniqueId}.{ext}
 * Cache-Control set for reasonable avatar refresh on re-upload.
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<UploadAvatarResult> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error('Storage not configured');
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const storageKey = buildAvatarStorageKey(userId, ext);

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

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600',
    })
  );

  const { url } = await getPlaybackUrl(storageKey, DEFAULT_AVATAR_EXPIRES);
  return { url, storageKey };
}

const DEFAULT_VIDEO_EXPIRES = 60 * 60 * 24 * 365; // 1 year for GET

export type UploadProcessedVideoResult = {
  url: string;
  storageKey: string;
};

/**
 * Upload processed video (e.g. after loudness normalization) to storage.
 * Overwrites the original at videos/{userId}/{videoId}.mp4.
 * Returns playback URL.
 */
export async function uploadProcessedVideo(
  userId: string,
  videoId: string,
  buffer: Buffer,
  contentType: string = 'video/mp4'
): Promise<UploadProcessedVideoResult> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error('Storage not configured');
  }

  const storageKey = buildVideoStorageKey(userId, videoId, 'mp4');

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

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const { url } = await getPlaybackUrl(storageKey, DEFAULT_VIDEO_EXPIRES);
  return { url, storageKey };
}
