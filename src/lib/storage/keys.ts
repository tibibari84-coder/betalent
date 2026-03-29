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

/**
 * Verifies `storageKey` matches the canonical pattern for this user/video (direct upload).
 * Prevents completing with an arbitrary key that does not belong to the upload path.
 */
export function isValidVideoStorageKeyForUser(userId: string, videoId: string, storageKey: string): boolean {
  if (!storageKey || storageKey.length > 512) return false;
  if (!storageKey.startsWith(VIDEO_KEY_PREFIX)) return false;
  const withoutPrefix = storageKey.slice(VIDEO_KEY_PREFIX.length);
  const slashIdx = withoutPrefix.indexOf('/');
  if (slashIdx <= 0) return false;
  const uid = withoutPrefix.slice(0, slashIdx);
  const rest = withoutPrefix.slice(slashIdx + 1);
  if (uid !== userId) return false;
  const dot = rest.lastIndexOf('.');
  if (dot <= 0) return false;
  const vid = rest.slice(0, dot);
  const ext = rest.slice(dot + 1);
  if (vid !== videoId) return false;
  if (!/^[a-z0-9]+$/i.test(ext)) return false;
  return true;
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
