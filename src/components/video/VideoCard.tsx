'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
import LeaderboardRankBadge from '@/components/leaderboard/LeaderboardRankBadge';
import VideoActionsMenu from '@/components/video/VideoActionsMenu';
import VideoCardActions from '@/components/video/VideoCardActions';
import FollowButton from '@/components/profile/FollowButton';
import { getDisplayCountryFlag } from '@/lib/video-card-formatters';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import { useViewer } from '@/contexts/ViewerContext';
import { accentDeepAlpha } from '@/constants/accent-tokens';

export type VideoCardBadgeVariant = 'starter' | 'rising' | 'trending' | 'new';

export interface VideoCardCreator {
  /** When set, enables ownership-aware actions (3-dots menu). */
  id?: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  country?: string | null;
  verified?: boolean;
  verificationLevel?: string | null;
}

export interface VideoCardStats {
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  votesCount?: number;
  talentScore?: number | null;
}

/** Card proportion variant. Discovery = taller, more immersive (Trending, For You, Challenge entries). */
export type VideoCardSize = 'standard' | 'discovery';

export interface VideoCardProps {
  id: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  /** When omitted (e.g. profile grid "my videos"), header shows only badge if any */
  creator?: VideoCardCreator | null;
  stats: VideoCardStats;
  badge?: VideoCardBadgeVariant | null;
  /** When set, badge pill shows this text (e.g. profile grid "Rising Talent") */
  badgeLabel?: string | null;
  challengeName?: string | null;
  genre?: string | null;
  className?: string;
  /** Profile grid mode: no creator header, same premium card style */
  variant?: 'default' | 'profile';
  /** standard: 280×420px. discovery: 260×460px, more short-video immersive (Trending, For You, Challenges). */
  cardSize?: VideoCardSize;
  /** Optional: override modal open (e.g. when not using context). If omitted, context openModal is used. */
  onOpenModal?: (videoId: string) => void;
  /** Optional: show on own profile for videos still processing (e.g. "⏳ Processing", "🎵 Analyzing audio"). */
  processingLabel?: string | null;
  /** Challenge context: show challenge rank badge (e.g. #1, #2) when provided */
  challengeRank?: number | null;
  /** Challenge voting: when provided with challengeSlug, show star vote (1–5) instead of talent VoteButton */
  challengeSlug?: string | null;
  challengeVote?: { votesCount: number; averageStars: number; myStars?: number | null } | null;
  /** Called when user submits a challenge star vote; use to sync parent state (e.g. myVotes). */
  onChallengeVoteSuccess?: (videoId: string, stars: number) => void;
  /** Override creator id for menus when not nested in `creator` (e.g. profile grid). */
  creatorUserId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  onVideoRemoved?: (videoId: string) => void;
}

export default function VideoCard({
  id,
  title,
  thumbnailUrl,
  creator,
  stats,
  badge,
  challengeName,
  genre,
  badgeLabel,
  className = '',
  variant = 'default',
  cardSize = 'standard',
  onOpenModal,
  processingLabel,
  challengeRank,
  challengeSlug,
  challengeVote,
  onChallengeVoteSuccess,
  creatorUserId,
  visibility = 'PUBLIC',
  onVideoRemoved,
}: VideoCardProps) {
  const router = useRouter();
  const { openModal: openPerformanceModal } = usePerformanceModal();
  const { viewer } = useViewer();
  const showCreator = variant === 'default' && creator;
  const displayName = showCreator ? (creator.displayName?.trim() || `@${creator.username}`) : '';
  const shareCreatorName = creator ? (creator.displayName?.trim() || `@${creator.username}`) : 'Creator';
  const menuCreatorId = creatorUserId ?? creator?.id;
  const creatorIdForFollow = creator?.id;
  const isOwnVideo = Boolean(viewer?.id && creatorIdForFollow && viewer.id === creatorIdForFollow);
  const showFollow = Boolean(showCreator && creatorIdForFollow && (!viewer?.id || !isOwnVideo));
  const isOwnerOrPublicShare = visibility === 'PUBLIC' || Boolean(viewer?.id && menuCreatorId && viewer.id === menuCreatorId);

  const isDiscovery = cardSize === 'discovery';
  /** Wider grid cells + capped height = cinematic portrait without a “narrow tower”. */
  const shellClass = [
    'w-full max-w-full min-w-0 mx-auto flex flex-col',
    'min-h-[300px] tablet:min-h-[340px]',
    isDiscovery
      ? 'h-[min(88vh,clamp(26rem,62vh,38rem))] tablet:h-[min(82vh,clamp(28rem,52vh,42rem))] laptop:h-[min(78vh,clamp(30rem,44vh,44rem))] xl-screen:h-[min(78vh,clamp(31rem,40vh,46rem))] ultrawide:h-[min(76vh,clamp(32rem,36vh,48rem))]'
      : 'h-[min(85vh,clamp(25rem,56vh,38rem))] tablet:h-[min(82vh,clamp(26rem,50vh,40rem))] laptop:h-[min(78vh,clamp(27rem,42vh,42rem))] xl-screen:h-[min(78vh,clamp(28rem,38vh,44rem))] ultrawide:h-[min(76vh,clamp(29rem,34vh,46rem))]',
  ].join(' ');

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const open = onOpenModal ?? ((vid: string) => openPerformanceModal(vid, challengeSlug ? { giftContext: 'challenge' } : undefined));
    open(id);
  };

  return (
    <Link
      href={`/video/${id}`}
      onClick={handleCardClick}
      className={`
        group flex flex-col relative overflow-hidden rounded-[16px]
        transition-all duration-300 ease-out
        hover:-translate-y-0.5 hover:scale-[1.01]
        hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)]
        border border-[rgba(255,70,90,0.12)]
        ${shellClass}
        ${className}
      `}
      style={{
        boxShadow: '0 10px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* 1. MEDIA — min height prevents flex from starving the thumbnail; keeps video visible at all breakpoints */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden bg-canvas-tertiary"
        style={{ minHeight: 'max(52%, 12.5rem)' }}
      >
        {menuCreatorId ? (
          <VideoActionsMenu
            videoId={id}
            title={title ?? 'Performance'}
            creatorId={menuCreatorId}
            visibility={visibility}
            onRemoved={onVideoRemoved}
            className="absolute top-2 right-2 z-[30] pointer-events-auto"
          />
        ) : null}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title ?? 'Performance'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted/60">
            <span className="text-5xl" aria-hidden>🎬</span>
          </div>
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 42%, transparent 52%, rgba(0,0,0,0.88) 100%)',
          }}
        />
        <LeaderboardRankBadge videoId={id} variant="card" className="pointer-events-auto" />
        {challengeRank != null && (
          <span
            className="absolute bottom-3 left-2 z-10 flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold text-white pointer-events-none"
            style={{
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            aria-label={`Challenge rank ${challengeRank}`}
          >
            #{challengeRank}
          </span>
        )}
      </div>

      {/* 2. HEADER — left: avatar + name + verified + flag, right: Follow + badge; perfectly centered and justified */}
      <div
        className="absolute top-2.5 left-2.5 right-2.5 z-10 min-w-0 overflow-hidden rounded-xl px-2.5 py-2 tablet:top-3 tablet:left-3 tablet:right-3 tablet:rounded-[14px] tablet:px-3 tablet:py-2.5 laptop:px-3.5"
        style={{
          background: 'rgba(26,26,28,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* LEFT GROUP: avatar + name + verified + flag */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {showCreator && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/profile/${creator.username}`);
                  }}
                  className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full overflow-hidden flex-shrink-0 bg-canvas-tertiary border border-[rgba(255,255,255,0.1)] flex items-center justify-center p-0 cursor-pointer hover:opacity-90 transition-opacity"
                  aria-label={`View ${displayName}`}
                >
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt="" className="avatar-image h-full w-full" />
                  ) : (
                    <span className="text-text-secondary font-semibold text-[12px] leading-none">
                      {displayName.charAt(0)}
                    </span>
                  )}
                </button>
                {/* Name gets all remaining space so it can show as much as possible */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/profile/${creator.username}`);
                  }}
                  className="text-left bg-transparent border-0 p-0 cursor-pointer hover:opacity-90 transition-opacity flex-1 min-w-0 overflow-hidden"
                  style={{ flex: '1 1 0%' }}
                >
                  <span className="text-[13px] tablet:text-[14px] font-semibold text-[#F5F7FA] leading-tight truncate block">
                    {displayName}
                  </span>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <VerifiedBadge verified={!!creator.verified} verificationLevel={creator.verificationLevel ?? undefined} size="md" />
                  {creator.country && (
                    <span className="w-[1.1em] text-[13px] leading-none inline-flex items-center justify-center" aria-hidden>
                      {getDisplayCountryFlag(creator.country)}
                    </span>
                  )}
                </div>
              </>
            )}
            {variant === 'profile' && !showCreator && <div className="flex-1 min-w-0" />}
          </div>
          {/* RIGHT GROUP: Follow + badge(s) */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {showFollow && creatorIdForFollow && (
              <FollowButton
                targetId={creatorIdForFollow}
                variant="secondary"
                size={isDiscovery ? 'icon' : 'compact'}
                stopPropagation
                className={isDiscovery ? '!border-white/15 !bg-black/35' : '!border-white/12 !bg-[rgba(26,26,28,0.75)] text-accent'}
              />
            )}
            {badge && (
              <Badge variant={badge} compactCard>
                {badgeLabel ?? undefined}
              </Badge>
            )}
            {variant === 'profile' && badgeLabel && !badge && (
              <span className="inline-flex items-center justify-center h-5 min-h-5 max-w-[80px] px-1.5 rounded-full text-[10px] font-semibold leading-none border shrink-0 overflow-hidden text-ellipsis whitespace-nowrap bg-[rgba(255,255,255,0.05)] text-[#cbd5e1] border-white/[0.08]">
                {badgeLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. META + ACTIONS — natural height (wrap-safe); gradient over media overlap */}
      <div
        className="relative z-10 flex flex-col justify-end min-w-0 shrink-0 overflow-visible -mt-12 pt-10"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.5) 100%)',
        }}
      >
        <div className={`min-w-0 flex flex-col ${isDiscovery ? 'px-3 pt-1 pb-2.5 tablet:px-3.5 laptop:px-4' : 'px-3.5 pt-1 pb-3 tablet:px-4 laptop:px-5'}`}>
          {/* Processing badge (own profile) or challenge pill */}
          <div className="flex items-center min-w-0 overflow-hidden flex-nowrap mb-1 gap-1.5">
            {processingLabel && (
              <span
                className="inline-flex items-center h-5 min-h-5 px-2 rounded-full text-[10px] font-semibold leading-none shrink-0 whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#e2e8f0',
                }}
              >
                {processingLabel}
              </span>
            )}
            {challengeName && (
              <span
                className="inline-flex items-center h-5 min-h-5 max-w-full min-w-0 px-2 rounded-full text-[10px] font-semibold leading-none border overflow-hidden text-ellipsis whitespace-nowrap shrink-0"
                style={{
                  background: accentDeepAlpha(0.15),
                  borderColor: accentDeepAlpha(0.4),
                  color: '#F5F7FA',
                }}
              >
                {challengeName}
              </span>
            )}
            {genre && !challengeName && (
              <span className="text-[10px] text-[#e2e8f0] font-medium leading-tight truncate min-w-0">
                {genre}
              </span>
            )}
          </div>

          {/* Title — two lines, enough space so it's readable */}
          {title && (
            <p
              className={`font-semibold text-[#F5F7FA] min-w-0 break-words overflow-hidden ${isDiscovery ? 'text-[13px] leading-[1.35] mb-2' : 'text-[15px] leading-[1.3] mb-3'}`}
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {title}
            </p>
          )}
          <div className={isDiscovery ? 'mb-2' : 'mb-3'}>
            <TalentScoreBadge
              score={stats.talentScore ?? null}
              votesCount={stats.votesCount ?? 0}
              variant="card"
              className={isDiscovery ? 'text-[10px]' : 'text-[11px]'}
            />
          </div>

          <VideoCardActions
            videoId={id}
            title={title ?? 'Performance'}
            stats={stats}
            onOpenPerformance={() => {
              const open = onOpenModal ?? ((vid: string) => openPerformanceModal(vid, challengeSlug ? { giftContext: 'challenge' } : undefined));
              open(id);
            }}
            density={isDiscovery ? 'discovery' : 'standard'}
            challengeSlug={challengeSlug ?? undefined}
            challengeVote={challengeVote ?? undefined}
            onChallengeVoteSuccess={onChallengeVoteSuccess}
            showShare={isOwnerOrPublicShare}
            sharePreview={{
              thumbnailUrl: thumbnailUrl ?? undefined,
              creatorName: shareCreatorName,
              country: creator?.country ?? undefined,
              challengeName: challengeName ?? undefined,
            }}
          />
        </div>
      </div>

    </Link>
  );
}
