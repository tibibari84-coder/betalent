'use client';

/**
 * Grid video card engagement — one toolbar, responsive behavior.
 * - Mobile: horizontal scroll (single row, no vertical “stack”).
 * - Tablet/desktop (768+): one nowrap row; share = icon-only in a quiet control (no “Share” label).
 */
import { useState } from 'react';
import { IconEye, IconComment, IconShare } from '@/components/ui/Icons';
import LikeButton from '@/components/video/LikeButton';
import VoteButton from '@/components/video/VoteButton';
import ChallengeStarVote from '@/components/challenge/ChallengeStarVote';
import ShareModal from '@/components/shared/ShareModal';
import { formatCompactCount } from '@/lib/video-card-formatters';

export interface VideoCardActionsStats {
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  votesCount?: number;
  talentScore?: number | null;
}

export interface VideoCardActionsProps {
  videoId: string;
  title: string;
  stats: VideoCardActionsStats;
  onOpenPerformance: () => void;
  density?: 'standard' | 'discovery';
  challengeSlug?: string | null;
  challengeVote?: {
    votesCount: number;
    averageStars: number;
    myStars?: number | null;
  } | null;
  onChallengeVoteSuccess?: (videoId: string, stars: number) => void;
  showShare: boolean;
  sharePreview: {
    thumbnailUrl?: string;
    creatorName: string;
    country?: string;
    challengeName?: string | null;
  };
}

export default function VideoCardActions({
  videoId,
  title,
  stats,
  onOpenPerformance,
  density = 'standard',
  challengeSlug,
  challengeVote,
  onChallengeVoteSuccess,
  showShare,
  sharePreview,
}: VideoCardActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const isDiscovery = density === 'discovery';
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/video/${videoId}` : '';

  const iconSm = isDiscovery ? 'w-[17px] h-[17px]' : 'w-[18px] h-[18px]';
  const iconMd = 'tablet:w-4 tablet:h-4';
  const textRow = isDiscovery
    ? 'text-[12px] tablet:text-[13px]'
    : 'text-[13px] tablet:text-[14px]';

  return (
    <>
      <div
        className={`
          flex w-full min-w-0 items-stretch tablet:items-center
          overflow-x-auto overflow-y-hidden tablet:overflow-visible
          gap-0 tablet:gap-0
          pb-1 tablet:pb-0.5 -mx-0.5 px-0.5 tablet:mx-0 tablet:px-0
          scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
          touch-pan-x tablet:touch-auto
          pt-2 border-t border-white/[0.08]
          tablet:flex-nowrap tablet:items-center tablet:justify-between tablet:gap-3
        `}
        role="toolbar"
        aria-label="Video actions"
      >
        <div
          className={`
            flex items-center gap-2 min-w-max tablet:min-w-0 tablet:flex-1 tablet:flex-nowrap
            tablet:gap-x-3 laptop:gap-x-4 tablet:overflow-hidden pr-2 tablet:pr-0
          `}
        >
          <LikeButton
            videoId={videoId}
            initialLiked={false}
            initialLikesCount={stats.likesCount}
            variant="inline"
            stopPropagation
            className={`${textRow} shrink-0 items-center gap-1.5 min-h-[44px] min-w-[44px] tablet:min-h-9 tablet:min-w-0 tablet:px-1.5 tablet:py-1 rounded-lg tablet:rounded-lg hover:bg-white/[0.07] tablet:hover:bg-white/[0.05]`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenPerformance();
            }}
            className={`inline-flex items-center gap-1.5 shrink-0 min-h-[44px] min-w-[44px] tablet:min-h-9 tablet:min-w-0 tablet:px-1.5 tablet:py-1 rounded-lg text-slate-200 hover:text-white hover:bg-white/[0.07] tablet:hover:bg-white/[0.05] transition-colors ${textRow} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45`}
            aria-label={`Comments, ${stats.commentsCount}`}
          >
            <IconComment className={`${iconSm} ${iconMd} shrink-0`} aria-hidden />
            <span className="tabular-nums font-semibold text-slate-100 min-w-[1.25ch]">
              {formatCompactCount(stats.commentsCount)}
            </span>
          </button>
          <span
            className={`inline-flex items-center gap-1.5 shrink-0 text-slate-400 min-h-[44px] tablet:min-h-0 tablet:py-1 ${textRow}`}
            aria-label={`${formatCompactCount(stats.viewsCount)} views`}
          >
            <IconEye className={`${iconSm} ${iconMd} shrink-0 text-slate-300`} aria-hidden />
            <span className="tabular-nums font-semibold text-slate-100 min-w-[1.25ch]">
              {formatCompactCount(stats.viewsCount)}
            </span>
          </span>
          {challengeSlug && challengeVote ? (
            <div className="shrink-0 min-w-0 tablet:min-w-[120px] laptop:min-w-[132px]">
              <ChallengeStarVote
                challengeSlug={challengeSlug}
                videoId={videoId}
                myStars={challengeVote.myStars ?? null}
                votesCount={challengeVote.votesCount}
                averageStars={challengeVote.averageStars}
                onVoteSuccess={(stars) => onChallengeVoteSuccess?.(videoId, stars)}
                variant="inline"
                stopPropagation
                className={`${textRow} min-h-[44px] tablet:min-h-9`}
              />
            </div>
          ) : (
            <VoteButton
              videoId={videoId}
              initialUserVote={null}
              initialVotesCount={stats.votesCount ?? 0}
              initialTalentScore={stats.talentScore ?? null}
              variant="inline"
              stopPropagation
              className={`${textRow} shrink-0 min-h-[44px] tablet:min-h-9`}
            />
          )}
        </div>

        {showShare && (
          <div className="flex items-center shrink-0 self-center pl-2 ml-auto tablet:ml-0 border-l border-white/[0.1] tablet:pl-3 tablet:ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShareOpen(true);
              }}
              className="
                inline-flex items-center justify-center
                min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0
                tablet:w-10 tablet:h-10 laptop:w-11 laptop:h-11
                rounded-xl text-slate-300 hover:text-white
                bg-white/[0.05] hover:bg-white/[0.1] tablet:bg-white/[0.04] tablet:hover:bg-white/[0.09]
                border border-white/[0.08] tablet:border-white/[0.08]
                transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
              "
              aria-label="Share video"
            >
              <IconShare className="w-5 h-5 tablet:w-[18px] tablet:h-[18px] laptop:w-5 laptop:h-5" aria-hidden />
              <span className="sr-only">Share</span>
            </button>
          </div>
        )}
      </div>

      {shareOpen && typeof window !== 'undefined' && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          shareUrl={shareUrl}
          preview={{
            title,
            creatorName: sharePreview.creatorName,
            country: sharePreview.country,
            challengeName: sharePreview.challengeName ?? undefined,
            thumbnailUrl: sharePreview.thumbnailUrl,
          }}
          trackResource={{ resourceType: 'video', resourceId: videoId }}
        />
      )}
    </>
  );
}
