import {
  buildThumbnailStorageKey,
  buildVideoStorageKey,
  ensureStorageObjectsRemovedOrNeutralized,
  extractStorageKeyFromUrl,
  getExtensionFromMime,
} from '@/lib/storage';

type VideoStorageRecord = {
  id: string;
  creatorId: string;
  storageKey: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  mimeType: string | null;
};

export function collectVideoStorageKeys(video: VideoStorageRecord): string[] {
  const keys = new Set<string>();
  if (video.storageKey) keys.add(video.storageKey);

  if (video.videoUrl) {
    const fromUrl = extractStorageKeyFromUrl(video.videoUrl);
    if (fromUrl) keys.add(fromUrl);
  }
  if (video.thumbnailUrl) {
    const fromThumb = extractStorageKeyFromUrl(video.thumbnailUrl);
    if (fromThumb) keys.add(fromThumb);
  }

  // Canonical processed output key.
  keys.add(buildVideoStorageKey(video.creatorId, video.id, 'mp4'));
  // Canonical original upload key from recorded mime type.
  if (video.mimeType) {
    keys.add(buildVideoStorageKey(video.creatorId, video.id, getExtensionFromMime(video.mimeType)));
  }
  // Canonical thumbnail key.
  keys.add(buildThumbnailStorageKey(video.creatorId, video.id));
  return Array.from(keys);
}

export async function deleteVideoStorageObjects(video: VideoStorageRecord): Promise<{
  deleted: string[];
  neutralized: string[];
  failed: Array<{ key: string; error: string }>;
}> {
  const keys = collectVideoStorageKeys(video);
  const result = await ensureStorageObjectsRemovedOrNeutralized(keys);
  console.info('[storage-lifecycle] video delete result', {
    videoId: video.id,
    deleted: result.deleted,
    neutralized: result.neutralized,
    failed: result.failed,
  });
  return result;
}
