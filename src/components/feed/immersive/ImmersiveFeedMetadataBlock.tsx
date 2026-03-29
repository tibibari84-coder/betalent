'use client';

import Link from 'next/link';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import { getDisplayCountryFlag } from '@/lib/video-card-formatters';
import type { VideoFeedItem } from '@/components/feed/VideoFeedCard';
import { cn } from '@/lib/utils';

export interface ImmersiveFeedMetadataBlockProps {
  item: Pick<VideoFeedItem, 'title' | 'challengeName' | 'styleLabel' | 'creator'>;
  captionShort: string;
  captionExpanded: boolean;
  showExpand: boolean;
  onCaptionClick: (e: React.MouseEvent) => void;
  /** Reserve space for overlay action rail (mobile) */
  reserveForOverlayRail?: boolean;
  className?: string;
}

export function ImmersiveFeedMetadataBlock({
  item,
  captionShort,
  captionExpanded,
  showExpand,
  onCaptionClick,
  reserveForOverlayRail = true,
  className,
}: ImmersiveFeedMetadataBlockProps) {
  const { creator, challengeName, styleLabel, title } = item;
  const caption = title;
  const flag = getDisplayCountryFlag(creator.country);

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 z-10 pointer-events-none p-4 md:p-5',
        reserveForOverlayRail ? 'right-16 xl:right-0 xl:pr-6' : 'right-0',
        className
      )}
      style={{
        paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))',
        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.38) 50%, transparent 100%)',
      }}
    >
      <Link
        href={`/profile/${creator.username}`}
        className="flex items-center gap-3 pointer-events-auto mb-2 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-full overflow-hidden flex-shrink-0 border-2 border-white/20 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt={creator.displayName} className="avatar-image h-full w-full" />
          ) : (
            <span className="text-[#B7BDC7] font-semibold text-base md:text-lg">{creator.displayName.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-[15px] md:text-[16px] truncate flex items-center gap-1.5 max-w-full">
            @{creator.username}
            {flag && <span className="text-base" aria-hidden>{flag}</span>}
            <VerifiedBadge verified={!!creator.verified} verificationLevel={creator.verificationLevel ?? undefined} size="sm" />
          </p>
          {challengeName ? (
            <p className="text-white/70 text-[12px] md:text-[13px] truncate">{challengeName}</p>
          ) : styleLabel ? (
            <p className="text-white/55 text-[12px] md:text-[13px] truncate">{styleLabel}</p>
          ) : null}
        </div>
      </Link>
      <div className="text-left pointer-events-auto min-w-0">
        <button type="button" onClick={onCaptionClick} className="text-left w-full min-w-0">
          <p
            className={`text-white text-[14px] md:text-[15px] leading-snug ${
              captionExpanded ? '' : 'line-clamp-2'
            }`}
          >
            {captionExpanded ? caption : captionShort}
          </p>
          {showExpand && !captionExpanded ? (
            <span className="text-white/70 text-[12px] mt-0.5 inline-block">more</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
