'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { IconComment, IconShare, IconPlay, IconEye } from '@/components/ui/Icons';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import ShareModal from '@/components/shared/ShareModal';
import LikeButton from '@/components/video/LikeButton';
import VoteButton from '@/components/video/VoteButton';
import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
import LeaderboardRankBadge from '@/components/leaderboard/LeaderboardRankBadge';
import { getDisplayCountryFlag, formatCompactCount } from '@/lib/video-card-formatters';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import { useFeedRegister } from '@/contexts/FeedActiveCardContext';
import FeedVideoPlayer from '@/components/feed/FeedVideoPlayer';
import { ACCENT_HEX, accentAlpha } from '@/constants/accent-tokens';
import VideoActionsMenu from '@/components/video/VideoActionsMenu';
import FollowButton from '@/components/profile/FollowButton';
import { useViewer } from '@/contexts/ViewerContext';
import { ImmersiveFeedMetadataBlock } from '@/components/feed/immersive/ImmersiveFeedMetadataBlock';
import { ImmersiveFeedActionRail } from '@/components/feed/immersive/ImmersiveFeedActionRail';

export interface VideoFeedItem {
  id: string;
  creatorId: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  title: string;
  thumbnailUrl?: string;
  videoUrl?: string | null;
  /** From feed API — used for qualified view threshold */
  durationSec?: number;
  challengeName?: string;
  /** From feed API Category.name */
  styleLabel?: string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    country?: string | null;
    verified?: boolean;
    verificationLevel?: string | null;
  };
  stats: {
    likesCount: number;
    viewsCount: number;
    commentsCount: number;
    votesCount?: number;
    talentScore?: number | null;
  };
}

interface VideoFeedCardProps {
  item: VideoFeedItem;
  index?: number;
  activeIndex?: number;
  isActive?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  /** 'feed' = full-screen TikTok layout; 'card' = compact list layout (following page) */
  variant?: 'feed' | 'card';
  onVideoRemoved?: (videoId: string) => void;
}

const MIN_VOTES_FOR_SCORE = 5;

function VideoFeedCardCompact({
  item,
  cardRef,
  isActive,
  preload,
  onOpenModal,
  shareUrl,
  shareOpen,
  setShareOpen,
  onVideoRemoved,
}: {
  item: VideoFeedItem;
  cardRef: React.Ref<HTMLElement>;
  isActive: boolean;
  preload: 'none' | 'metadata' | 'auto';
  onOpenModal: () => void;
  shareUrl: string;
  shareOpen: boolean;
  setShareOpen: (v: boolean) => void;
  onVideoRemoved?: (videoId: string) => void;
}) {
  const { viewer, loading: viewerLoading } = useViewer();
  const { id, title, thumbnailUrl, videoUrl, challengeName, creator, stats, creatorId, visibility } = item;
  const showFollowCompact =
    !viewerLoading && (!viewer?.id || viewer.id !== creatorId);
  const votesCount = stats.votesCount ?? 0;
  const talentScore = stats.talentScore ?? null;
  const showTalentScore = votesCount >= MIN_VOTES_FOR_SCORE && talentScore != null;
  const flag = getDisplayCountryFlag(creator.country);

  return (
    <article
      ref={cardRef}
      className="w-full mx-auto overflow-hidden flex flex-col max-w-full md:max-w-[min(100%,720px)] laptop:max-w-[min(100%,800px)] xl-screen:max-w-[min(100%,880px)] rounded-[18px] md:rounded-[20px] min-w-0"
      style={{
        background: 'rgba(18,18,20,0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 64px rgba(0,0,0,0.28)',
      }}
    >
      <div className="px-[14px] py-[14px] md:px-[18px] md:py-[16px] flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 min-w-0 mb-2">
          <Link href={`/profile/${creator.username}`} className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="rounded-full overflow-hidden flex-shrink-0 border border-white/10 w-[36px] h-[36px] md:w-[40px] md:h-[40px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.displayName} className="avatar-image h-full w-full" />
              ) : (
                <span className="text-[#B7BDC7] font-semibold text-sm">{creator.displayName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-[#F5F7FA] font-semibold truncate text-sm md:text-[15px] flex items-center gap-1.5">
                <span className="truncate">{creator.displayName}</span>
                {flag && <span className="text-sm" aria-hidden>{flag}</span>}
              </p>
              <p className="text-[#B7BDC7] truncate text-[12px] md:text-[13px]">{challengeName ?? 'Performance'}</p>
            </div>
            <VerifiedBadge verified={!!creator.verified} verificationLevel={creator.verificationLevel ?? undefined} size="md" />
          </Link>
          {showFollowCompact ? (
            <FollowButton
              targetId={creatorId}
              variant="secondary"
              size="compact"
              stopPropagation
              className="flex-shrink-0 !h-9 !min-h-9 !px-3 !text-xs md:!text-[13px] !border-white/12 !bg-white/[0.04] text-white/90 hover:!bg-white/10"
            />
          ) : null}
        </header>
        <div className="w-full mt-3 md:mt-4 rounded-[14px] md:rounded-[16px] overflow-hidden bg-[#0D0D0E] relative aspect-[4/5] max-h-[min(72vh,320px)] md:max-h-[min(78vh,480px)] laptop:max-h-[min(80vh,560px)]">
          <VideoActionsMenu
            videoId={id}
            title={title}
            creatorId={creatorId}
            creatorProfileId={creator.id}
            visibility={visibility}
            onRemoved={onVideoRemoved}
            compact
            className="absolute top-2 right-2 z-20"
          />
          {videoUrl ? (
            <FeedVideoPlayer
              videoId={id}
              videoUrl={videoUrl}
              thumbnailUrl={thumbnailUrl}
              title={title}
              isActive={isActive}
              preload={preload}
              onOpenModal={onOpenModal}
              durationSec={item.durationSec}
            />
          ) : (
            <button type="button" onClick={onOpenModal} className="absolute inset-0 w-full h-full cursor-pointer text-left block" aria-label={`Watch ${title}`}>
              {thumbnailUrl ? <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#7F8792]"><span className="text-5xl">🎬</span></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full flex items-center justify-center w-11 h-11 md:w-12 md:h-12" style={{ background: accentAlpha(0.35), border: `1px solid ${accentAlpha(0.5)}` }}>
                  <IconPlay className="w-5 h-5 md:w-6 md:h-6 ml-0.5" style={{ color: ACCENT_HEX }} aria-hidden />
                </div>
              </div>
            </button>
          )}
        </div>
        <div className="min-w-0 mt-3 md:mt-4">
          <button type="button" onClick={onOpenModal} className="text-left w-full text-[#F5F7FA] font-semibold leading-[1.2] break-words text-[18px] md:text-[21px] hover:text-white transition-colors">{title}</button>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TalentScoreBadge score={talentScore} votesCount={votesCount} variant="card" className="text-[11px] md:text-[12px]" />
            <LeaderboardRankBadge videoId={id} variant="inline" />
          </div>
        </div>
        <div
          className="flex flex-wrap items-center min-w-0 mt-3 md:mt-4 pb-1 gap-x-3 gap-y-2.5 md:gap-x-4 border-t border-white/[0.06] pt-3"
          role="toolbar"
          aria-label="Video actions"
        >
          <LikeButton
            videoId={id}
            initialLiked={false}
            initialLikesCount={stats.likesCount}
            variant="inline"
            stopPropagation
            className="shrink-0 gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 px-1 -ml-1 md:ml-0 rounded-lg md:rounded-none text-[12px] md:text-[13px] hover:bg-white/[0.06] md:hover:bg-transparent"
          />
          <span className="inline-flex items-center shrink-0 gap-1.5 min-h-[44px] md:min-h-0 text-[#94a3b8] text-[12px] md:text-[13px]" aria-label={`${formatCompactCount(stats.viewsCount)} views`}>
            <IconEye className="shrink-0 text-[#cbd5e1] w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden />
            <span className="font-medium tabular-nums text-[#f1f5f9] min-w-[1ch]">{formatCompactCount(stats.viewsCount)}</span>
          </span>
          <button
            type="button"
            className="inline-flex items-center shrink-0 gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 px-1 rounded-lg md:rounded-none text-[#f1f5f9] hover:text-white hover:bg-white/[0.06] md:hover:bg-transparent text-[12px] md:text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenModal();
            }}
            aria-label={`Comments, ${stats.commentsCount}`}
          >
            <IconComment className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden />
            <span className="tabular-nums min-w-[1ch]">{formatCompactCount(stats.commentsCount)}</span>
          </button>
          <VoteButton
            videoId={id}
            initialUserVote={null}
            initialVotesCount={votesCount}
            initialTalentScore={talentScore}
            variant="inline"
            stopPropagation
            className="shrink-0 gap-1.5 min-h-[44px] md:min-h-0 text-[12px] md:text-[13px]"
          />
          <button
            type="button"
            className="inline-flex items-center shrink-0 gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 ml-auto md:ml-0 pl-2 md:pl-0 border-l border-white/[0.06] md:border-l-0 text-[#f1f5f9] hover:text-white transition-colors text-[12px] md:text-[13px] font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(true);
            }}
            aria-label="Share video"
          >
            <IconShare className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} shareUrl={shareUrl} preview={{ thumbnailUrl, creatorName: creator.displayName, country: creator.country ?? undefined, challengeName, title }} trackResource={{ resourceType: 'video', resourceId: id }} />
    </article>
  );
}

function VideoFeedCardInner({
  item,
  index = 0,
  activeIndex = 0,
  isActive = false,
  preload = 'none',
  variant = 'feed',
  onVideoRemoved,
}: VideoFeedCardProps) {
  const { id, title, thumbnailUrl, videoUrl, challengeName, creator, stats, creatorId, visibility } = item;
  const { viewer, loading: viewerLoading } = useViewer();
  const { openModal } = usePerformanceModal();
  const feedRegister = useFeedRegister();
  const cardRef = useRef<HTMLElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(stats.likesCount);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [likeBounce, setLikeBounce] = useState(false);
  const [showGiftButton, setShowGiftButton] = useState(false);
  const showFollowRail = !viewerLoading && (!viewer?.id || viewer.id !== creatorId);

  const GIFT_WATCH_THRESHOLD_MS = 5000;
  useEffect(() => {
    if (!isActive || !viewer?.id) return;
    const t = setTimeout(() => setShowGiftButton(true), GIFT_WATCH_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, [isActive, viewer?.id]);

  useEffect(() => {
    if (liked) setShowGiftButton(true);
  }, [liked]);

  useEffect(() => {
    if (variant !== 'feed') return;
    const register = feedRegister?.registerCard;
    if (!register) return;
    const el = cardRef.current;
    register(id, el);
    return () => register(id, null);
  }, [feedRegister?.registerCard, id, variant]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/video/${id}` : '';

  const handleOpenModal = useCallback(() => openModal(id), [openModal, id]);
  const handleOpenGift = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openModal(id, { openGiftPanel: true });
    },
    [openModal, id]
  );

  const handleDoubleTapLike = useCallback(() => {
    setLiked((prev) => {
      if (prev) return prev;
      setLikeBounce(true);
      setTimeout(() => setLikeBounce(false), 400);
      setLikesCount((c) => c + 1);
      fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id }),
      })
        .then((res) => {
          if (!res.ok) {
            setLiked(false);
            setLikesCount(stats.likesCount);
          }
        })
        .catch(() => {
          setLiked(false);
          setLikesCount(stats.likesCount);
        });
      return true;
    });
  }, [id, stats.likesCount]);

  const handleLikeToggle = useCallback((l: boolean, c: number) => {
    setLiked(l);
    setLikesCount(c);
    if (l) {
      setLikeBounce(true);
      setTimeout(() => setLikeBounce(false), 400);
    }
  }, []);

  const caption = title;
  const captionShort = caption.length > 80 ? caption.slice(0, 80) + '…' : caption;
  const showExpand = caption.length > 80;

  if (variant === 'card') {
    return (
      <VideoFeedCardCompact
        item={item}
        cardRef={cardRef}
        isActive={false}
        preload="none"
        onOpenModal={handleOpenModal}
        shareUrl={shareUrl}
        shareOpen={shareOpen}
        setShareOpen={setShareOpen}
        onVideoRemoved={onVideoRemoved}
      />
    );
  }

  return (
    <article
      ref={cardRef}
      className="relative flex-shrink-0 w-full h-full min-h-[100dvh] max-h-[100dvh] snap-center snap-always overflow-hidden bg-[#070707] grid grid-cols-1 grid-rows-1 xl:grid-cols-[minmax(0,1fr)_104px]"
      style={{
        minHeight: '100dvh',
        maxHeight: '100dvh',
      }}
    >
      {/* Media + metadata share the primary column; rail overlays this cell on small screens, moves to col 2 on xl */}
      <div className="relative col-start-1 row-start-1 min-h-[100dvh] max-h-[100dvh] min-w-0 overflow-hidden xl:rounded-l-[20px] xl:border xl:border-white/[0.07] xl:border-r-0">
        <div className="absolute inset-0 w-full h-full">
          {videoUrl ? (
            <FeedVideoPlayer
              videoId={id}
              videoUrl={videoUrl}
              thumbnailUrl={thumbnailUrl}
              title={title}
              isActive={isActive}
              preload={preload}
              onOpenModal={handleOpenModal}
              onDoubleTapLike={handleDoubleTapLike}
              durationSec={item.durationSec}
            />
          ) : (
            <button
              type="button"
              onClick={handleOpenModal}
              className="absolute inset-0 w-full h-full cursor-pointer text-left block"
              aria-label={`Watch ${title}`}
            >
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt={title} className="feed-media-fill w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#7F8792]">
                  <span className="text-5xl md:text-6xl">🎬</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0 w-14 h-14"
                  style={{
                    background: accentAlpha(0.35),
                    border: `1px solid ${accentAlpha(0.5)}`,
                  }}
                >
                  <IconPlay className="w-7 h-7 ml-0.5" style={{ color: ACCENT_HEX }} aria-hidden />
                </div>
              </div>
            </button>
          )}
        </div>

        <ImmersiveFeedMetadataBlock
          item={item}
          captionShort={captionShort}
          captionExpanded={captionExpanded}
          showExpand={showExpand}
          reserveForOverlayRail
          onCaptionClick={(e) => {
            e.stopPropagation();
            if (showExpand && !captionExpanded) setCaptionExpanded(true);
            else handleOpenModal();
          }}
        />
      </div>

      <ImmersiveFeedActionRail
        className="col-start-1 row-start-1 xl:col-start-2"
        item={item}
        liked={liked}
        likesCount={likesCount}
        likeBounce={likeBounce}
        showFollowRail={showFollowRail}
        onLikeToggle={handleLikeToggle}
        onOpenComments={(e) => {
          e.stopPropagation();
          handleOpenModal();
        }}
        showGiftButton={showGiftButton}
        onOpenGift={handleOpenGift}
        onVideoRemoved={onVideoRemoved}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={{
          thumbnailUrl,
          creatorName: creator.displayName,
          country: creator.country ?? undefined,
          challengeName,
          title,
        }}
        trackResource={{ resourceType: 'video', resourceId: id }}
      />
    </article>
  );
}

export default memo(VideoFeedCardInner);
