'use client';

import { useEffect, useRef, memo } from 'react';
import { IconPlay } from '@/components/ui/Icons';
import { useFeedRegister } from '@/contexts/FeedActiveCardContext';
import { ACCENT_HEX, accentAlpha } from '@/constants/accent-tokens';
import type { VideoFeedItem } from '@/components/feed/VideoFeedCard';

/**
 * Lightweight off-window / buffer slot: poster + IO registration only.
 * No &lt;video&gt;, no social rail — keeps scroll smooth and memory bounded.
 */
function ImmersiveFeedAmbientCardInner({ item }: { item: VideoFeedItem }) {
  const { id, title, thumbnailUrl, creator } = item;
  const feedRegister = useFeedRegister();
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const register = feedRegister?.registerCard;
    if (!register) return;
    const el = cardRef.current;
    register(id, el);
    return () => register(id, null);
  }, [feedRegister?.registerCard, id]);

  return (
    <article
      ref={cardRef}
      className="relative flex-shrink-0 w-full h-full min-h-[100dvh] snap-center snap-always overflow-hidden bg-[#070707]"
      style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
    >
      <div className="absolute inset-0">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="feed-media-fill absolute inset-0 w-full h-full object-cover opacity-85" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#4b5563] text-5xl">🎬</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40 pointer-events-none" />
        <div className="absolute bottom-28 left-4 right-20 z-[1] pointer-events-none">
          <p className="text-white/90 font-semibold text-[15px] truncate">@{creator.username}</p>
          <p className="text-white/55 text-[13px] line-clamp-2 mt-1">{title}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full flex items-center justify-center w-14 h-14 opacity-50"
            style={{
              background: accentAlpha(0.25),
              border: `1px solid ${accentAlpha(0.4)}`,
            }}
            aria-hidden
          >
            <IconPlay className="w-7 h-7 ml-0.5" style={{ color: ACCENT_HEX }} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(ImmersiveFeedAmbientCardInner);
