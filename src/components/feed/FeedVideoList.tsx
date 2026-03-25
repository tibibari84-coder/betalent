'use client';

import { useMemo } from 'react';
import VideoFeedCard, { type VideoFeedItem } from '@/components/feed/VideoFeedCard';
import ImmersiveFeedAmbientCard from '@/components/feed/immersive/ImmersiveFeedAmbientCard';
import FeedCreatorSuggestionSlot from '@/components/recommendations/FeedCreatorSuggestionSlot';
import { useFeedActiveCard } from '@/contexts/FeedActiveCardContext';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

/** Full player + interactions only within this distance of the active index (performance + memory) */
const FOCUS_RADIUS = 1;

export type FeedInterleavedRow =
  | { type: 'video'; item: VideoFeedItem }
  | {
      type: 'suggestion';
      creator: CreatorRecommendationPayload;
      rowKey: string;
      onDismissed: () => void;
      onFollowed: () => void;
    };

interface FeedVideoListProps {
  /** Legacy: video-only feed. Ignored when `rows` is set. */
  videos?: VideoFeedItem[];
  /** Optional interleaved suggestions + videos (e.g. For You + logged-in). */
  rows?: FeedInterleavedRow[];
  getPreload: (index: number, activeIndex: number) => 'none' | 'metadata' | 'auto';
  onVideoRemoved?: (videoId: string) => void;
}

export default function FeedVideoList({ videos, rows, getPreload, onVideoRemoved }: FeedVideoListProps) {
  const feedActive = useFeedActiveCard();
  const activeCardId = feedActive?.activeCardId ?? null;

  const effectiveRows: FeedInterleavedRow[] = useMemo(() => {
    if (rows?.length) return rows;
    return (videos ?? []).map((item) => ({ type: 'video' as const, item }));
  }, [rows, videos]);

  const { activeRowIndex, effectiveActiveId } = useMemo(() => {
    const first = effectiveRows[0];
    const firstId =
      first?.type === 'video' ? first.item.id : first?.type === 'suggestion' ? first.rowKey : null;
    const effective = activeCardId ?? firstId;
    if (!effective || effectiveRows.length === 0) {
      return { activeRowIndex: 0, effectiveActiveId: null as string | null };
    }
    const idx = effectiveRows.findIndex((r) =>
      r.type === 'video' ? r.item.id === effective : r.rowKey === effective
    );
    const ai = idx >= 0 ? idx : 0;
    const row = effectiveRows[ai];
    const eid = row?.type === 'video' ? row.item.id : row?.type === 'suggestion' ? row.rowKey : effective;
    return { activeRowIndex: ai, effectiveActiveId: eid };
  }, [activeCardId, effectiveRows]);

  /** Map row index → sequential video index (for preload policy on video cards). */
  const videoIndexBeforeRow = useMemo(() => {
    const map = new Map<number, number>();
    let v = 0;
    for (let i = 0; i < effectiveRows.length; i++) {
      map.set(i, v);
      if (effectiveRows[i].type === 'video') v += 1;
    }
    return map;
  }, [effectiveRows]);

  const activeVideoIndex = videoIndexBeforeRow.get(activeRowIndex) ?? 0;

  return (
    <>
      {effectiveRows.map((row, index) => {
        const inFocus = Math.abs(index - activeRowIndex) <= FOCUS_RADIUS;

        if (row.type === 'suggestion') {
          const isActive = effectiveActiveId != null && row.rowKey === effectiveActiveId;
          return (
            <div
              key={row.rowKey}
              className="feed-card-slot flex-shrink-0 w-full snap-center snap-always"
              style={{
                minHeight: '100dvh',
                maxHeight: '100dvh',
                height: '100dvh',
              }}
            >
              <FeedCreatorSuggestionSlot
                creator={row.creator}
                rowKey={row.rowKey}
                inFocus={inFocus}
                isActive={isActive}
                onDismissed={row.onDismissed}
                onFollowed={row.onFollowed}
              />
            </div>
          );
        }

        const item = row.item;
        const vi = videoIndexBeforeRow.get(index) ?? 0;
        const isActive = effectiveActiveId != null && item.id === effectiveActiveId;

        return (
          <div
            key={item.id}
            className="feed-card-slot flex-shrink-0 w-full snap-center snap-always"
            style={{
              minHeight: '100dvh',
              maxHeight: '100dvh',
              height: '100dvh',
            }}
          >
            {inFocus ? (
              <VideoFeedCard
                item={item}
                index={vi}
                activeIndex={activeVideoIndex}
                isActive={isActive}
                preload={getPreload(vi, activeVideoIndex)}
                onVideoRemoved={onVideoRemoved}
              />
            ) : (
              <ImmersiveFeedAmbientCard item={item} />
            )}
          </div>
        );
      })}
    </>
  );
}
