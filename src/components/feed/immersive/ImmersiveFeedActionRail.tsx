'use client';

import { IconComment, IconShare, IconGift } from '@/components/ui/Icons';
import LikeButton from '@/components/video/LikeButton';
import VoteButton from '@/components/video/VoteButton';
import VideoActionsMenu from '@/components/video/VideoActionsMenu';
import FollowButton from '@/components/profile/FollowButton';
import { formatCompactCount } from '@/lib/video-card-formatters';
import type { VideoFeedItem } from '@/components/feed/VideoFeedCard';
import { cn } from '@/lib/utils';

export interface ImmersiveFeedActionRailProps {
  item: VideoFeedItem;
  liked: boolean;
  likesCount: number;
  likeBounce: boolean;
  showFollowRail: boolean;
  /** When true, show subtle gift button (gate: watch time or interaction). */
  showGiftButton?: boolean;
  onLikeToggle: (liked: boolean, count: number) => void;
  onOpenComments: (e: React.MouseEvent) => void;
  onOpenGift?: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onVideoRemoved?: (videoId: string) => void;
  className?: string;
}

/**
 * Mobile/tablet: absolute stack on the right over the video.
 * xl+: dedicated column beside the video (no overlap, premium desktop layout).
 */
export function ImmersiveFeedActionRail({
  item,
  liked,
  likesCount,
  likeBounce,
  showFollowRail,
  onLikeToggle,
  onOpenComments,
  onOpenGift,
  onShare,
  onVideoRemoved,
  showGiftButton = false,
  className,
}: ImmersiveFeedActionRailProps) {
  const { id, title, creatorId, visibility, stats } = item;
  const votesCount = stats.votesCount ?? 0;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-5 z-20',
        'absolute xl:static right-0 pr-2 md:pr-3',
        'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] xl:bottom-auto',
        'xl:h-full xl:self-stretch xl:justify-end xl:w-[92px] xl:shrink-0 xl:pr-2 xl:pl-3',
        'xl:border-l xl:border-white/[0.08]',
        'xl:bg-gradient-to-l xl:from-black/35 xl:via-black/15 xl:to-transparent',
        className
      )}
    >
      <VideoActionsMenu
        videoId={id}
        title={title}
        creatorId={creatorId}
        visibility={visibility}
        onRemoved={onVideoRemoved}
        compact
        className="mb-1"
      />
      <div className={likeBounce ? 'feed-like-bounce' : ''}>
        <LikeButton
          videoId={id}
          initialLiked={liked}
          initialLikesCount={likesCount}
          onToggle={onLikeToggle}
          variant="rail"
          stopPropagation
        />
      </div>

      <button
        type="button"
        onClick={onOpenComments}
        className="flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/90 hover:text-white active:scale-90 transition-transform duration-150"
        aria-label="Comments"
      >
        <IconComment className="w-7 h-7" />
        <span className="text-[11px] font-medium tabular-nums">{formatCompactCount(stats.commentsCount)}</span>
      </button>

      {showGiftButton && onOpenGift ? (
        <button
          type="button"
          onClick={onOpenGift}
          className="flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/70 hover:text-white/90 active:scale-90 transition-transform duration-150"
          aria-label="Send gift"
        >
          <IconGift className="w-6 h-6 shrink-0" aria-hidden />
          <span className="text-[10px] font-medium">Gift</span>
        </button>
      ) : null}

      <VoteButton
        videoId={id}
        initialUserVote={null}
        initialVotesCount={votesCount}
        initialTalentScore={stats.talentScore ?? null}
        variant="rail"
        stopPropagation
        className="text-white/90"
      />

      <button
        type="button"
        onClick={onShare}
        className="flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/90 hover:text-white active:scale-90 transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg px-1"
        aria-label="Share video"
      >
        <IconShare className="w-6 h-6 shrink-0" aria-hidden />
        <span className="text-[11px] font-medium">Share</span>
      </button>

      {showFollowRail ? (
        <FollowButton targetId={creatorId} layout="rail" variant="secondary" stopPropagation className="text-white/90" />
      ) : null}
    </div>
  );
}
