'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/profile/FollowButton';
import { useFeedRegister } from '@/contexts/FeedActiveCardContext';
import { ACCENT_HEX, accentAlpha } from '@/constants/accent-tokens';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

function subtitle(creator: CreatorRecommendationPayload): string {
  if (creator.recommendationReason) return creator.recommendationReason;
  if (creator.talentType?.trim()) return creator.talentType.trim();
  return 'Suggested performer';
}

export function FeedCreatorSuggestionAmbient({ creator, rowKey }: { creator: CreatorRecommendationPayload; rowKey: string }) {
  const feedRegister = useFeedRegister();
  const cardRef = useRef<HTMLElement>(null);
  const thumb = creator.previews[0]?.thumbnailUrl;

  useEffect(() => {
    const register = feedRegister?.registerCard;
    if (!register) return;
    const el = cardRef.current;
    register(rowKey, el);
    return () => register(rowKey, null);
  }, [feedRegister?.registerCard, rowKey]);

  return (
    <article
      ref={cardRef}
      className="relative flex-shrink-0 w-full h-full min-h-[100dvh] snap-center snap-always overflow-hidden bg-[#070707]"
      style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
    >
      <div className="absolute inset-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote creator thumbnail URL
          <img src={thumb} alt="" className="feed-media-fill absolute inset-0 w-full h-full object-cover opacity-85" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${accentAlpha(0.2)} 0%, #070707 55%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45 pointer-events-none" />
        <div className="absolute bottom-28 left-4 right-20 z-[1] pointer-events-none">
          <p className="text-white/90 font-semibold text-[15px] truncate">{creator.displayName}</p>
          <p className="text-white/55 text-[13px] line-clamp-2 mt-1">@{creator.username}</p>
        </div>
      </div>
    </article>
  );
}

export default function FeedCreatorSuggestionSlot({
  creator,
  rowKey,
  inFocus,
  isActive,
  onDismissed,
  onFollowed,
}: {
  creator: CreatorRecommendationPayload;
  rowKey: string;
  inFocus: boolean;
  isActive: boolean;
  onDismissed: () => void;
  onFollowed: () => void;
}) {
  const feedRegister = useFeedRegister();
  const cardRef = useRef<HTMLElement>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const register = feedRegister?.registerCard;
    if (!register) return;
    const el = cardRef.current;
    register(rowKey, el);
    return () => register(rowKey, null);
  }, [feedRegister?.registerCard, rowKey]);

  const handleNotInterested = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      const res = await fetch('/api/recommendations/creators/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ creatorId: creator.id, reason: 'NOT_INTERESTED' }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (res.ok && data?.ok) onDismissed();
      else setDismissing(false);
    } catch {
      setDismissing(false);
    }
  };

  if (!inFocus) {
    return <FeedCreatorSuggestionAmbient creator={creator} rowKey={rowKey} />;
  }

  const label = subtitle(creator);

  return (
    <article
      ref={cardRef}
      className="relative flex-shrink-0 w-full h-full min-h-[100dvh] max-h-[100dvh] snap-center snap-always overflow-hidden bg-[#080608] grid grid-cols-1 grid-rows-1 xl:grid-cols-[minmax(0,1fr)_92px]"
      style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
    >
      <div className="relative col-start-1 row-start-1 min-h-[100dvh] max-h-[100dvh] min-w-0 overflow-hidden xl:rounded-l-[20px] xl:border xl:border-white/[0.07] xl:border-r-0 flex flex-col">
        <div
          className="absolute inset-0 pointer-events-none opacity-90"
          style={{
            background: `radial-gradient(ellipse 120% 80% at 50% -10%, ${accentAlpha(0.18)} 0%, transparent 50%)`,
          }}
        />

        <div className="relative z-[1] flex flex-col items-center justify-center flex-1 px-6 pt-10 pb-32 safe-area-pb">
          <Link href={`/profile/${creator.username}`} className="flex flex-col items-center gap-4 min-w-0 w-full max-w-sm">
            <div
              className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden ring-2 ring-white/15 shrink-0"
              style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accentAlpha(0.25)}` }}
            >
              {creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote creator avatars (same as feed cards)
                <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl text-white/40 bg-white/5">
                  {creator.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-[20px] sm:text-[22px] font-semibold text-white truncate">{creator.displayName}</p>
              <p className="text-[15px] text-white/55 truncate mt-0.5">@{creator.username}</p>
              <p className="text-[13px] text-white/45 mt-2 leading-snug line-clamp-2">{label}</p>
            </div>
          </Link>

          {creator.previews.length > 0 && (
            <div className="mt-8 flex gap-2 justify-center w-full max-w-md px-1">
              {creator.previews.map((p) => (
                <Link
                  key={p.videoId}
                  href={`/video/${p.videoId}`}
                  className="relative flex-1 min-w-0 max-w-[110px] aspect-[9/16] rounded-xl overflow-hidden border border-white/10 bg-white/5"
                >
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/35 text-center p-1">
                      {p.title.slice(0, 24)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
            <FollowButton
              targetId={creator.id}
              initialFollowing={false}
              variant="primary"
              size="default"
              className="w-full justify-center"
              stopPropagation
              onToggle={(following) => {
                if (following) onFollowed();
              }}
            />
            <button
              type="button"
              onClick={handleNotInterested}
              disabled={dismissing}
              className="w-full min-h-[44px] rounded-[12px] text-[14px] font-medium text-white/70 border border-white/12 bg-white/[0.04] hover:bg-white/[0.07] transition disabled:opacity-50"
            >
              {dismissing ? '…' : 'Not interested'}
            </button>
          </div>
        </div>

        {isActive && (
          <div
            className="absolute bottom-6 left-0 right-0 z-[2] flex justify-center pointer-events-none xl:hidden"
            aria-hidden
          >
            <div
              className="h-1 w-10 rounded-full"
              style={{ background: accentAlpha(0.5), boxShadow: `0 0 12px ${ACCENT_HEX}55` }}
            />
          </div>
        )}
      </div>
    </article>
  );
}
