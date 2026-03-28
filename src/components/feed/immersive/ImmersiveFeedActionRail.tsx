'use client';

import { IconComment, IconGift } from '@/components/ui/Icons';
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
  onVideoRemoved?: (videoId: string) => void;
  className?: string;
}

/**
 * BeTalent-specific floating action column: glass stack, balanced spacing — not a TikTok clone layout.
 * Order: like → comment → gift (optional) → vote → follow → more (share/copy/report live in the sheet).
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
  onVideoRemoved,
  showGiftButton = false,
  className,
}: ImmersiveFeedActionRailProps) {
  const { id, title, creatorId, visibility, stats } = item;
  const votesCount = stats.votesCount ?? 0;

  return (
    <div
      className={cn(
        'z-20 flex flex-col items-center pr-2 md:pr-3',
        'absolute xl:static right-0',
        'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] xl:bottom-auto',
        'xl:h-full xl:self-stretch xl:justify-end xl:w-[104px] xl:shrink-0 xl:border-l xl:border-white/[0.07] xl:bg-gradient-to-l xl:from-black/30 xl:via-black/10 xl:to-transparent xl:pl-3 xl:pr-2',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 px-2 py-3',
          'rounded-[22px] border border-white/[0.12]',
          'bg-gradient-to-b from-black/50 via-black/40 to-black/55',
          'shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]',
          'backdrop-blur-xl backdrop-saturate-150',
          'xl:gap-5 xl:py-4 xl:px-2.5'
        )}
        style={{ WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className={cn(likeBounce && 'feed-like-bounce')}>
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
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 text-white/92 transition-transform duration-150 hover:text-white active:translate-y-[1px]"
          aria-label="Comments"
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.06] shadow-inner shadow-black/20"
            aria-hidden
          >
            <IconComment className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium tabular-nums text-white/75">{formatCompactCount(stats.commentsCount)}</span>
        </button>

        {showGiftButton && onOpenGift ? (
          <button
            type="button"
            onClick={onOpenGift}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 text-amber-100/90 transition-transform duration-150 hover:text-amber-50 active:translate-y-[1px]"
            aria-label="Send gift"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-500/[0.09]">
              <IconGift className="h-6 w-6 shrink-0" aria-hidden />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100/70">Gift</span>
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

        {showFollowRail ? (
          <div className="flex w-full justify-center border-t border-white/[0.08] pt-3">
            <FollowButton targetId={creatorId} layout="rail" variant="secondary" stopPropagation className="text-white/90" />
          </div>
        ) : null}

        <div className="flex w-full justify-center border-t border-white/[0.08] pt-3">
          <VideoActionsMenu
            videoId={id}
            title={title}
            creatorId={creatorId}
            visibility={visibility}
            onRemoved={onVideoRemoved}
            compact
            className="!mb-0"
          />
        </div>
      </div>
    </div>
  );
}
