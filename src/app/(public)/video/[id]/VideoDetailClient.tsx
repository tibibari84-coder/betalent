'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconHeart,
  IconComment,
  IconShare,
  IconShieldCheck,
  IconEye,
  IconGift,
  IconFlag,
} from '@/components/ui/Icons';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoSupportModule from '@/components/video/VideoSupportModule';
import ShareModal from '@/components/shared/ShareModal';
import GiftModal from '@/components/shared/GiftModal';
import ReportModal from '@/components/shared/ReportModal';
import SuperVoteModal from '@/components/shared/SuperVoteModal';
import Badge from '@/components/shared/Badge';
import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
import LeaderboardRankBadge from '@/components/leaderboard/LeaderboardRankBadge';
import VideoCard from '@/components/video/VideoCard';
import LikeButton from '@/components/video/LikeButton';
import VoteButton from '@/components/video/VoteButton';
import CommentsPanel from '@/components/comments/CommentsPanel';
import FollowButton from '@/components/profile/FollowButton';
import { getFlagEmoji } from '@/lib/countries';
import { CREATOR_TIER_LABELS } from '@/constants/app';
import { CONTENT_TYPE_LABELS } from '@/constants/platform-rules';
import { isMobileOrTabletDevice } from '@/lib/device';
import type { ContentType, VideoVisibility } from '@prisma/client';

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

type VideoData = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  votesCount?: number;
  talentScore?: number | null;
  coinsCount?: number;
  giftsCount?: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    bio: string | null;
    isVerified: boolean;
    creatorTier: string;
    followersCount: number;
  };
  category: { id: string; name: string; slug: string };
  contentType?: ContentType;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      country: string | null;
    };
  }>;
};

type RelatedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  visibility: VideoVisibility;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
  };
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  votesCount?: number;
  talentScore?: number | null;
};

interface Props {
  video: VideoData;
  related: RelatedVideo[];
  initialLiked?: boolean;
  initialFollowing?: boolean;
  initialUserVote?: number | null;
}

export default function VideoDetailClient({ video, related, initialLiked = false, initialFollowing = false, initialUserVote = null }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [followersCount, setFollowersCount] = useState(video.creator.followersCount);
  const [votesCount, setVotesCount] = useState(video.votesCount ?? 0);
  const [talentScore, setTalentScore] = useState<number | null>(video.talentScore ?? null);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [superVoteOpen, setSuperVoteOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(typeof window !== 'undefined' ? `${window.location.origin}/video/${video.id}` : '');
  }, [video.id]);

  const redirectToLogin = () => {
    router.push(`/login?from=${encodeURIComponent(`/video/${video.id}`)}`);
  };
  const [commentsCount, setCommentsCount] = useState(video.commentsCount);
  const [coinsCount, setCoinsCount] = useState(video.coinsCount ?? 0);
  const [giftsCount, setGiftsCount] = useState(video.giftsCount ?? 0);
  const [supportRefresh, setSupportRefresh] = useState(0);
  const [isMobileFull, setIsMobileFull] = useState(false);

  const handleLikeToggle = (l: boolean, c: number) => {
    setLiked(l);
    setLikesCount(c);
  };

  useEffect(() => {
    setIsMobileFull(isMobileOrTabletDevice());
  }, []);

  const mainDesktop = (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-6 pb-24 md:pb-12" style={{ backgroundColor: '#0D0D0E' }}>
      <div className="grid grid-cols-card-discovery md:grid-cols-card-discovery-md laptop:grid-cols-card-discovery-laptop desktop:grid-cols-card-discovery-desktop xl-screen:grid-cols-card-discovery-xl ultrawide:grid-cols-card-discovery-ultrawide 5k:grid-cols-card-discovery-5k gap-3 laptop:gap-4 desktop:gap-5">
        {/* Main - player + info */}
        <div className="lg:col-span-2 space-y-6">
          <VideoPlayer
            videoId={video.id}
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            title={video.title}
            durationSec={video.durationSec}
          />
          <div className="min-w-0 overflow-hidden">
            <h1 className="font-display text-[22px] md:text-[26px] font-bold text-text-primary mb-2 line-clamp-2 break-words overflow-hidden min-w-0">{video.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-secondary mb-4 min-w-0 overflow-hidden">
              <span className="flex items-center gap-1.5">
                <IconEye className="w-4 h-4" />
                {formatCount(video.viewsCount)} views
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                {formatCount(coinsCount)} coins · {formatCount(giftsCount)} gifts
              </span>
              <span>{video.category.name}</span>
              {video.contentType && video.contentType !== 'ORIGINAL' && (
                <span className="text-text-muted">
                  {video.contentType && video.contentType in CONTENT_TYPE_LABELS
                    ? CONTENT_TYPE_LABELS[video.contentType as keyof typeof CONTENT_TYPE_LABELS]
                    : video.contentType}
                </span>
              )}
              <span>{timeAgo(new Date(video.createdAt))}</span>
            </div>
            {video.description && (
              <p className="text-[13px] text-text-secondary leading-relaxed mb-6">{video.description}</p>
            )}

            {/* Creator row */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-[20px] mb-6 min-w-0" style={{ background: 'rgba(26,26,28,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Link href={`/profile/${video.creator.username}`} className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-canvas-tertiary flex items-center justify-center shrink-0">
                  {video.creator.avatarUrl ? (
                    <img src={video.creator.avatarUrl} alt="" className="avatar-image h-full w-full" />
                  ) : (
                    <span className="text-xl font-bold text-text-muted">{video.creator.displayName.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="font-semibold text-text-primary flex items-center gap-2 min-w-0 flex-nowrap">
                    <span className="truncate min-w-0">{video.creator.displayName}</span>
                    {video.creator.isVerified && <IconShieldCheck className="w-4 h-4 text-accent shrink-0" />}
                    <Badge variant={video.creator.creatorTier !== 'STARTER' ? 'rising' : 'starter'} className="shrink-0">
                      {CREATOR_TIER_LABELS[video.creator.creatorTier as keyof typeof CREATOR_TIER_LABELS] ?? video.creator.creatorTier}
                    </Badge>
                  </p>
                  <p className="text-[13px] text-text-secondary truncate">@{video.creator.username}</p>
                  <div className="flex items-center gap-2 flex-wrap text-[13px] text-text-muted min-w-0">
                    {video.creator.country && <span className="text-[16px] shrink-0" aria-hidden>{getFlagEmoji(video.creator.country)}</span>}
                    <span>{formatCount(followersCount)} followers</span>
                  </div>
                  {video.creator.bio && (
                    <p className="text-[13px] text-text-secondary mt-2 line-clamp-2 break-words overflow-hidden">{video.creator.bio}</p>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                <FollowButton
                  targetId={video.creator.id}
                  initialFollowing={initialFollowing}
                  onToggle={(following, count) => {
                    if (typeof count === 'number') setFollowersCount(count);
                  }}
                  variant="primary"
                  size="compact"
                />
              </div>
            </div>

            {/* Interaction bar: Like · Comment · Vote · Gift · Share */}
            <div
              className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0 overflow-hidden"
              role="toolbar"
              aria-label="Video actions"
            >
              <LikeButton
                videoId={video.id}
                initialLiked={liked}
                initialLikesCount={likesCount}
                onToggle={handleLikeToggle}
                onAuthRequired={redirectToLogin}
                variant="buttonCompact"
              />
              <VoteButton
                videoId={video.id}
                initialUserVote={userVote}
                initialVotesCount={votesCount}
                initialTalentScore={talentScore}
                onAuthRequired={redirectToLogin}
                onVoteSuccess={(uv, vc, ts) => {
                  setUserVote(uv);
                  setVotesCount(vc);
                  setTalentScore(ts);
                }}
                variant="button"
              />
              <button
                type="button"
                onClick={() => setCommentsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium min-h-[44px] bg-canvas-tertiary border border-transparent text-text-secondary hover:text-text-primary hover:border-white/10 transition-colors"
              >
                <IconComment className="w-5 h-5 shrink-0" />
                <span>{formatCount(commentsCount)}</span>
              </button>
              <button
                type="button"
                onClick={() => setSuperVoteOpen(true)}
                aria-label="Super Vote"
                className="flex items-center gap-2 px-4 h-[38px] rounded-[10px] font-medium bg-[rgba(255,255,255,0.08)] border border-white/[0.08] text-text-primary hover:bg-white/[0.12] hover:border-white/[0.12] transition-colors"
              >
                <span className="text-base leading-none">⭐</span>
                <span>Super Vote</span>
              </button>
              <button
                type="button"
                onClick={() => setGiftOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium min-h-[44px] bg-white/[0.04] border border-white/[0.12] text-text-primary hover:border-white/[0.2] hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.99]"
                aria-label="Send gift"
              >
                <IconGift className="w-5 h-5 shrink-0 text-text-secondary" />
                <span>Gift</span>
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium min-h-[44px] bg-canvas-tertiary border border-transparent text-text-secondary hover:text-text-primary hover:border-white/10 transition-colors"
              >
                <IconShare className="w-5 h-5 shrink-0" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium min-h-[44px] bg-canvas-tertiary border border-transparent text-text-secondary hover:text-text-primary hover:border-white/10 transition-colors"
                aria-label="Report"
              >
                <IconFlag className="w-5 h-5 shrink-0" />
                <span>Report</span>
              </button>
            </div>

            {/* Video-level support – secondary, below actions */}
            <div className="mt-4">
              <VideoSupportModule
                videoId={video.id}
                initialCoins={coinsCount}
                initialGifts={giftsCount}
                refreshTrigger={supportRefresh}
              />
            </div>
          </div>
        </div>

        {/* Related */}
        <div>
          <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4">Related</h2>
          <div className="space-y-6">
            {related.length === 0 ? (
              <p className="text-text-secondary text-[13px]">No related videos yet.</p>
            ) : (
              related.map((v) => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl ?? undefined}
                  creator={{
                    ...v.creator,
                    id: v.creator.id,
                    avatarUrl: v.creator.avatarUrl ?? undefined,
                    country: v.creator.country ?? undefined,
                  }}
                  visibility={v.visibility}
                  stats={{ likesCount: v.likesCount, viewsCount: v.viewsCount, commentsCount: v.commentsCount, votesCount: v.votesCount, talentScore: v.talentScore }}
                  className="max-w-[min(100%,340px)] mx-auto laptop:max-w-[min(100%,380px)]"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const mainMobileFull = (
    <div
      className="relative w-full min-h-screen bg-black text-white overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 0% -20%, rgba(196,18,47,0.45), transparent 55%), radial-gradient(circle at 120% 120%, rgba(196,18,47,0.3), transparent 60%), #050509',
      }}
    >
      <div className="relative h-screen w-full max-w-[600px] mx-auto flex flex-col">
        {/* Video area */}
        <div className="relative flex-1 flex items-center justify-center px-2 pt-4 pb-20">
          <div className="relative w-full h-full max-h-full flex items-center justify-center">
            <VideoPlayer
              videoId={video.id}
              videoUrl={video.videoUrl}
              thumbnailUrl={video.thumbnailUrl}
              title={video.title}
              durationSec={video.durationSec}
            />
          </div>

          {/* Right action rail */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                // delegate to LikeButton in desktop layout via redirect
                redirectToLogin();
              }}
              className="flex flex-col items-center gap-1 text-[11px] text-white/80"
              aria-label="Like"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-white/20">
                <IconHeart className="w-5 h-5" />
              </span>
              <span className="tabular-nums">{formatCount(likesCount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-white/80"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-white/20">
                <IconComment className="w-5 h-5" />
              </span>
              <span className="tabular-nums">{formatCount(commentsCount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSuperVoteOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-white/85"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(196,18,47,0.85)] shadow-[0_0_20px_rgba(196,18,47,0.8)]">
                ⭐
              </span>
              <span>Super</span>
            </button>
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-white/80"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-white/20">
                <IconGift className="w-5 h-5" />
              </span>
              <span>Gift</span>
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-white/80"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-white/20">
                <IconShare className="w-5 h-5" />
              </span>
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Bottom info panel */}
        <div
          className="absolute inset-x-0 bottom-0 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 px-4"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,1) 100%)',
          }}
        >
          {/* Creator row inline */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <Link
              href={`/profile/${video.creator.username}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-canvas-tertiary flex items-center justify-center shrink-0">
                {video.creator.avatarUrl ? (
                  <img src={video.creator.avatarUrl} alt="" className="avatar-image h-full w-full" />
                ) : (
                  <span className="text-sm font-bold text-text-muted">
                    {video.creator.displayName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-[14px] font-semibold flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{video.creator.displayName}</span>
                  {video.creator.isVerified && (
                    <IconShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  <Badge
                    variant={video.creator.creatorTier !== 'STARTER' ? 'rising' : 'starter'}
                    className="shrink-0 text-[10px]"
                  >
                    {CREATOR_TIER_LABELS[video.creator.creatorTier as keyof typeof CREATOR_TIER_LABELS] ??
                      video.creator.creatorTier}
                  </Badge>
                </p>
                <p className="text-[12px] text-white/65 truncate">
                  @{video.creator.username}{' '}
                  {video.creator.country && (
                    <span className="ml-1 text-[14px]" aria-hidden>
                      {getFlagEmoji(video.creator.country)}
                    </span>
                  )}
                </p>
              </div>
            </Link>
            <FollowButton
              targetId={video.creator.id}
              initialFollowing={initialFollowing}
              onToggle={(following, count) => {
                if (typeof count === 'number') setFollowersCount(count);
              }}
              variant="primary"
              size="compact"
            />
          </div>

          {/* Title + meta */}
          <div className="space-y-1.5 mb-2">
            <h1 className="font-display text-[17px] font-semibold leading-snug line-clamp-2">
              {video.title}
            </h1>
            <div className="flex items-center flex-wrap gap-2 text-[11px] text-white/65">
              <span className="flex items-center gap-1">
                <IconEye className="w-3.5 h-3.5" />
                {formatCount(video.viewsCount)} views
              </span>
              {typeof votesCount === 'number' && votesCount > 0 && (
                <span className="flex items-center gap-2">
                  <span className="text-white/70">{formatCount(votesCount)} votes</span>
                  <TalentScoreBadge
                    score={talentScore}
                    votesCount={votesCount}
                    variant="video"
                  />
                </span>
              )}
              <LeaderboardRankBadge videoId={video.id} variant="inline" />
              <span>{video.category.name}</span>
              <span>{timeAgo(new Date(video.createdAt))}</span>
            </div>
          </div>

          {/* Description / caption */}
          {video.description && (
            <p className="text-[12px] text-white/75 leading-relaxed line-clamp-3 mb-2">
              {video.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobileFull ? mainMobileFull : mainDesktop}

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={{
          title: video.title,
          creatorName: video.creator.displayName,
          country: video.creator.country ?? undefined,
          thumbnailUrl: video.thumbnailUrl ?? undefined,
        }}
        trackResource={{ resourceType: 'video', resourceId: video.id }}
      />

      <GiftModal
        isOpen={giftOpen}
        onClose={() => setGiftOpen(false)}
        videoId={video.id}
        videoTitle={video.title}
        creatorName={video.creator.displayName}
        onSent={(payload) => {
          setCoinsCount(payload.coinsCount);
          setGiftsCount(payload.giftsCount);
          setSupportRefresh((n) => n + 1);
        }}
      />

      <SuperVoteModal
        isOpen={superVoteOpen}
        onClose={() => setSuperVoteOpen(false)}
        videoId={video.id}
        performerName={video.creator.displayName}
      />

      <CommentsPanel
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        commentsCount={commentsCount}
        videoId={video.id}
        onCommentsCountChange={setCommentsCount}
      />

      <ReportModal
        videoId={video.id}
        videoTitle={video.title}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
