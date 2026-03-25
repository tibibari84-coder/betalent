import type { VideoFeedItem } from '@/components/feed/VideoFeedCard';
import type { FeedInterleavedRow } from '@/components/feed/FeedVideoList';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

/** First suggestion after the 4th video (index 3); then every 7 videos (cadence, not every post). */
const FIRST_INSERT_AFTER_VIDEO_INDEX = 3;
const INSERT_EVERY_VIDEOS_AFTER_FIRST = 7;

/**
 * Interleave creator suggestion full-screen slots into the For You feed for logged-in viewers.
 * Uses a queue over `suggestions` in API order (already ranked server-side).
 */
export function mergeForYouWithSuggestions(
  videos: VideoFeedItem[],
  suggestions: CreatorRecommendationPayload[] | null | undefined,
  handlers: {
    onDismiss: (creatorId: string) => void;
    onFollow: (creatorId: string) => void;
  }
): FeedInterleavedRow[] {
  if (!suggestions?.length) {
    return videos.map((item) => ({ type: 'video' as const, item }));
  }

  const rows: FeedInterleavedRow[] = [];
  let q = 0;
  const queue = [...suggestions];

  for (let i = 0; i < videos.length; i++) {
    rows.push({ type: 'video', item: videos[i] });

    const insertHere =
      i === FIRST_INSERT_AFTER_VIDEO_INDEX ||
      (i > FIRST_INSERT_AFTER_VIDEO_INDEX &&
        (i - FIRST_INSERT_AFTER_VIDEO_INDEX) % INSERT_EVERY_VIDEOS_AFTER_FIRST === 0);

    if (insertHere && q < queue.length) {
      const c = queue[q++];
      rows.push({
        type: 'suggestion',
        creator: c,
        rowKey: `rec-${c.id}-v${i}`,
        onDismissed: () => handlers.onDismiss(c.id),
        onFollowed: () => handlers.onFollow(c.id),
      });
    }
  }

  return rows;
}
