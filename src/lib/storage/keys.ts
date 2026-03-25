/**
 * Storage key naming for uploads and playback.
 * Structure: videos/{userId}/{videoId}.{ext}
 * Thumbnails: thumbnails/{userId}/{videoId}.jpg
 */

import { VIDEO_KEY_PREFIX, THUMBNAIL_KEY_PREFIX, AVATAR_KEY_PREFIX } from './config';

/**
 * Build avatar storage key: avatars/{userId}/{uniqueId}.{ext}
 * Unique ID avoids collisions and enables cache busting on re-upload.
 */
export function buildAvatarStorageKey(userId: string, extension: string, uniqueId?: string): string {
  const ext = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const id = uniqueId ?? crypto.randomUUID();
  return `${AVATAR_KEY_PREFIX}${userId}/${id}.${ext}`;
}

export function buildVideoStorageKey(userId: string, videoId: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  const safe = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  return `${VIDEO_KEY_PREFIX}${userId}/${videoId}.${safe}`;
}

export function buildThumbnailStorageKey(userId: string, videoId: string): string {
  return `${THUMBNAIL_KEY_PREFIX}${userId}/${videoId}.jpg`;
}

export function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/webm': 'webm',
  };
  return map[mimeType] ?? 'mp4';
}

export function getAvatarExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimeType?.toLowerCase()] ?? 'jpg';
}
