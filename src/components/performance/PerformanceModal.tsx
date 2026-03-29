'use client';

import type { VideoVisibility } from '@prisma/client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IconHeart, IconComment, IconGift, IconX, IconFlag } from '@/components/ui/Icons';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
import LeaderboardRankBadge from '@/components/leaderboard/LeaderboardRankBadge';
import ModalVideoPlayer from '@/components/video/ModalVideoPlayer';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import GiftModal from '@/components/shared/GiftModal';
import SuperVoteModal from '@/components/shared/SuperVoteModal';
import ReportModal from '@/components/shared/ReportModal';
import VideoActionsMenu from '@/components/video/VideoActionsMenu';
import FollowButton from '@/components/profile/FollowButton';
import LikeButton from '@/components/video/LikeButton';
import VoteButton from '@/components/video/VoteButton';
import CommentsPanel, { type CommentItem } from '@/components/comments/CommentsPanel';
import { SUPER_VOTE_PACKAGES } from '@/constants/coins';
import { CONTENT_TYPE_LABELS } from '@/constants/platform-rules';

type VideoPayload = {
  id: string;
  title: string;
  description: string | null;
  contentType?: 'ORIGINAL' | 'COVER' | 'REMIX';
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  votesCount?: number;
  talentScore?: number | null;
  coinsCount?: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    bio: string | null;
    isVerified: boolean;
    verificationLevel?: string | null;
    creatorTier: string;
    followersCount: number;
  };
  category: { id: string; name: string; slug: string };
  visibility?: VideoVisibility;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { username: string; displayName: string; avatarUrl: string | null; country: string | null };
  }>;
  giftSummary?: { totalCoinsReceived: number; totalGiftsReceived: number };
  supportStats?: {
    totalSuperVotes: number;
    totalCoinsEarned: number;
    forYouGiftCoinsTotal?: number;
    recentGiftVelocity?: number;
  };
};

type VideoSupportStrip = {
  totalCoinsReceived: number;
  totalGiftsReceived: number;
  recentGifts: Array<{ id: string; senderName: string; giftName: string }>;
  topSupporters: Array<{ userId: string; displayName: string; username: string; totalCoinsSent: number }>;
};

type RelatedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  creator: { username: string; displayName: string; avatarUrl: string | null; country: string | null };
};

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

interface PerformanceModalProps {
  videoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PerformanceModal({ videoId, isOpen, onClose }: PerformanceModalProps) {
  const { openModal, giftContext, openGiftPanelOnMount } = usePerformanceModal();
  const [video, setVideo] = useState<VideoPayload | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [userState, setUserState] = useState<{ liked: boolean; following: boolean; userVote: number | null }>({ liked: false, following: false, userVote: null });
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [votesCount, setVotesCount] = useState(0);
  const [talentScore, setTalentScore] = useState<number | null>(null);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [superVoteOpen, setSuperVoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [supportStrip, setSupportStrip] = useState<VideoSupportStrip | null>(null);
  const [supportRefresh, setSupportRefresh] = useState(0);
  const fetchComments = useCallback(async (videoId: string) => {
    try {
      const res = await fetch(`/api/comments?videoId=${encodeURIComponent(videoId)}&limit=3`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.comments)) {
        setComments(data.comments);
        if (typeof data.commentsCount === 'number') setCommentsCount(data.commentsCount);
      }
    } catch {
      // keep existing comments
    }
  }, []);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
  }, [closing]);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onClose(), 200);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  useEffect(() => {
    if (video && openGiftPanelOnMount) setGiftOpen(true);
  }, [video, openGiftPanelOnMount]);

  const fetchVideo = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [res, userRes] = await Promise.all([
        fetch(`/api/videos/${id}`),
        fetch(`/api/videos/${id}/user-state`),
      ]);
      const data = await res.json();
      if (!data.ok || !data.video) {
        setVideo(null);
        return;
      }
      const v = data.video as VideoPayload;
      setVideo(v);
      setLikesCount(v.likesCount);
      setCommentsCount(v.commentsCount);
      setVotesCount((v as { votesCount?: number }).votesCount ?? 0);
      setTalentScore((v as { talentScore?: number | null }).talentScore ?? null);
      fetchComments(id);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserState({ liked: u.liked ?? false, following: u.following ?? false, userVote: u.userVote ?? null });
        setLiked(u.liked ?? false);
        setUserVote(u.userVote ?? null);
      }
      if (v.creator?.id) {
        const relRes = await fetch(`/api/videos/${id}/related-by-creator?creatorId=${encodeURIComponent(v.creator.id)}`);
        if (relRes.ok) {
          const relData = await relRes.json();
          setRelated(relData.videos ?? []);
        }
      }
      fetch('/api/wallet').then((r) => r.ok && r.json().then((d) => d.wallet && setWalletBalance(d.wallet.balance ?? d.wallet.coinBalance ?? 0))).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  useEffect(() => {
    if (!video?.id) return;
    let cancelled = false;
    fetch(`/api/videos/${encodeURIComponent(video.id)}/support`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.ok || !d.support) return;
        setSupportStrip(d.support);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [video?.id, supportRefresh]);

  useEffect(() => {
    const onGift = (ev: Event) => {
      const id = (ev as CustomEvent<{ videoId?: string }>).detail?.videoId;
      if (id && id === video?.id) setSupportRefresh((n) => n + 1);
    };
    window.addEventListener('video-support-updated', onGift);
    return () => window.removeEventListener('video-support-updated', onGift);
  }, [video?.id]);

  useEffect(() => {
    if (isOpen && videoId) fetchVideo(videoId);
  }, [isOpen, videoId, fetchVideo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleLikeToggle = useCallback((l: boolean, c: number) => {
    setLiked(l);
    setLikesCount(c);
  }, []);

  const superVotes = video?.supportStats?.totalSuperVotes ?? 0;
  const coinsEarned = video?.supportStats?.totalCoinsEarned ?? video?.giftSummary?.totalCoinsReceived ?? video?.coinsCount ?? 0;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="flex flex-col lg:flex-row w-full max-w-[1200px] max-h-[90vh] lg:max-h-[85vh] mx-auto rounded-2xl overflow-hidden border border-white/[0.04]"
      style={{
        background: '#08080a',
        animation: closing ? 'performance-modal-content-out 0.2s ease-in forwards' : 'performance-modal-content-in 0.25s ease-out forwards',
        boxShadow: '0 32px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left: Video — hero, cinematic focus */}
      <div className="relative flex-1 min-w-0 flex flex-col bg-black">
        {video?.id ? (
          <div
            className="pointer-events-auto absolute left-2 top-[max(8px,env(safe-area-inset-top))] z-30 md:left-3"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoActionsMenu
              videoId={video.id}
              title={video.title}
              creatorId={video.creator.id}
              visibility={video.visibility ?? 'PUBLIC'}
              onRemoved={(removedId) => {
                if (removedId === videoId) handleClose();
              }}
            />
          </div>
        ) : null}
        <ModalVideoPlayer
          videoId={video?.id ?? ''}
          videoUrl={video?.videoUrl ?? ''}
          thumbnailUrl={video?.thumbnailUrl}
          title={video?.title ?? ''}
          durationSec={Math.max(1, video?.durationSec ?? 0)}
          trackViews={!!video?.id}
          onClose={handleClose}
        />
      </div>

      {/* Right: Info panel — premium streaming, calm hierarchy */}
      <div
        className="w-full lg:w-[380px] flex-shrink-0 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-white/[0.04]"
        style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.98) 0%, #0a0a0c 100%)' }}
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Creator — clear hierarchy, no clutter */}
          <div className="flex items-center gap-3">
            <Link href={`/profile/${video?.creator?.username ?? '#'}`} className="shrink-0 ring-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center ring-1 ring-white/[0.04]">
                {video?.creator?.avatarUrl ? (
                  <img src={video.creator.avatarUrl} alt="" className="avatar-image h-full w-full" />
                ) : (
                  <span className="text-[15px] font-medium text-white/60">{video?.creator?.displayName?.charAt(0) ?? '?'}</span>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[15px] text-white truncate tracking-tight flex items-center gap-1.5">
                {video?.creator?.displayName}
                <VerifiedBadge verified={!!video?.creator?.isVerified} verificationLevel={video?.creator?.verificationLevel ?? undefined} size="sm" />
              </p>
              <p className="text-[12px] text-white/40 truncate tracking-wide">@{video?.creator?.username}</p>
            </div>
            {video?.creator?.id && (
              <FollowButton targetId={video.creator.id} initialFollowing={userState.following} variant="primary" size="compact" />
            )}
          </div>

          {/* Style + content type — subtle, single line */}
          <p className="text-[12px] text-white/45 tracking-wide">
            <span className="text-white/35 uppercase tracking-[0.12em]">Style</span>
            <span className="text-white/50 mx-1.5">·</span>
            <span className="text-white/65">{video?.category?.name ?? '—'}</span>
            {video?.contentType && video.contentType !== 'ORIGINAL' && (
              <>
                <span className="text-white/50 mx-1.5">·</span>
                <span className="text-white/55">{CONTENT_TYPE_LABELS[video.contentType]}</span>
              </>
            )}
          </p>

          {/* Title — clear, readable, premium */}
          <h1 className="font-display text-[17px] font-semibold text-white leading-snug tracking-tight line-clamp-2">
            {video?.title}
          </h1>

          {/* Stats — muted, scannable */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/50">
            <span className="flex items-center gap-1.5">
              <IconHeart className="w-3.5 h-3.5 text-white/40" />
              {formatCount(likesCount)} Likes
            </span>
            <span>{formatCount(superVotes)} Super Votes</span>
            <span>{formatCount(coinsEarned)} Coins Earned</span>
            <TalentScoreBadge
              score={talentScore}
              votesCount={votesCount}
              variant="video"
            />
            {video && <LeaderboardRankBadge videoId={video.id} variant="inline" />}
          </div>

          {/* Gift social proof — lightweight */}
          {supportStrip && (supportStrip.recentGifts.length > 0 || supportStrip.topSupporters.length > 0) && (
            <div
              className="rounded-xl border border-white/[0.05] px-3 py-2.5 space-y-1.5"
              style={{ background: 'rgba(196,18,47,0.06)' }}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 font-medium">Support</p>
              {supportStrip.recentGifts[0] && (
                <p className="text-[12px] text-white/80">
                  <span className="font-semibold text-white">{supportStrip.recentGifts[0].senderName}</span>
                  <span className="text-white/50"> sent </span>
                  <span className="text-white/90">{supportStrip.recentGifts[0].giftName}</span>
                </p>
              )}
              {supportStrip.topSupporters[0] && (
                <p className="text-[11px] text-amber-200/85">
                  Top supporter:{' '}
                  {supportStrip.topSupporters[0].displayName || supportStrip.topSupporters[0].username} ·{' '}
                  {formatCount(supportStrip.topSupporters[0].totalCoinsSent)} coins
                </p>
              )}
              <p className="text-[10px] text-white/40 tabular-nums">
                {formatCount(supportStrip.totalGiftsReceived)} gifts · {formatCount(supportStrip.totalCoinsReceived)} coins total
              </p>
            </div>
          )}

          {/* Support actions — elegant, clear hierarchy */}
          <div className="flex flex-wrap gap-2">
            {video && (
              <LikeButton
                videoId={video.id}
                initialLiked={liked}
                initialLikesCount={likesCount}
                onToggle={handleLikeToggle}
                variant="button"
                label="Like"
              />
            )}
            {video && (
              <VoteButton
                videoId={video.id}
                initialUserVote={userVote}
                initialVotesCount={votesCount}
                initialTalentScore={talentScore}
                onVoteSuccess={(_, count, score) => {
                  setVotesCount(count);
                  setTalentScore(score);
                  setUserVote(_);
                }}
                variant="button"
              />
            )}
            <button
              type="button"
              onClick={() => setSuperVoteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] bg-white/[0.03] text-white/85 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.09] transition-all duration-200"
            >
              <span className="text-[13px] opacity-80">⭐</span> Super Vote
            </button>
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] bg-white/[0.03] text-white/85 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.09] transition-all duration-200"
            >
              <IconGift className="w-4 h-4 text-white/60" /> Gift
            </button>
          </div>

          {/* Super vote — clear section, minimal clutter */}
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-medium mb-2.5">Super Vote</p>
            <ul className="space-y-1.5 mb-2.5">
              {Object.entries(SUPER_VOTE_PACKAGES).map(([votes, coins]) => (
                <li key={votes} className="text-[12px] text-white/55">
                  {votes} Super Vote{Number(votes) > 1 ? 's' : ''} — {coins} coins
                </li>
              ))}
            </ul>
            {walletBalance != null && (
              <p className="text-[11px] text-white/35 mb-2.5">Wallet: {walletBalance.toLocaleString()} coins</p>
            )}
            <button
              type="button"
              onClick={() => setSuperVoteOpen(true)}
              className="w-full py-2 rounded-[10px] text-[12px] font-medium bg-[#c4122f]/80 text-white/95 hover:bg-[#c4122f]/95 transition-colors duration-200"
            >
              Choose & confirm
            </button>
          </div>

          {/* Gift — one clear CTA */}
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-medium mb-1.5">Send a gift</p>
            <p className="text-[11px] text-white/40 mb-2.5">Music Note, Microphone, Headphones, Drum Beat, Golden Score, Platinum Record</p>
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="w-full py-2 rounded-[10px] text-[12px] font-medium border border-white/[0.08] text-white/80 hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors duration-200"
            >
              Send Gift
            </button>
          </div>

          {/* Bio — minimal, calm */}
          {video?.creator?.bio && (
            <p className="text-[12px] text-white/45 leading-relaxed line-clamp-2">{video.creator.bio}</p>
          )}

          {/* Comments — clean list */}
          <div>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex items-center justify-between w-full mb-2"
            >
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-medium">Comments</span>
              <span className="text-[12px] text-white/50 tabular-nums">{commentsCount}</span>
            </button>
            <div className="space-y-2.5 max-h-28 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-[12px] text-white/40">No comments yet.</p>
              ) : (
              comments.slice(0, 3).map((c) => (
                <div key={c.id} className="flex gap-2.5 text-[12px] min-w-0">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-white/[0.06] flex items-center justify-center">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="avatar-image h-full w-full" />
                    ) : (
                      <span className="text-white/50 text-[10px] font-medium">{c.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white/75 truncate">@{c.username}</span>
                    <span className="text-white/50 break-words">
                      {' '}{(c as { isDeleted?: boolean }).isDeleted || c.body === '[deleted]' ? 'Comment deleted' : c.body}
                    </span>
                    <span className="text-white/30 text-[11px] ml-1">{c.timestamp}</span>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          {/* Report — subtle, bottom */}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/55 transition-colors"
          >
            <IconFlag className="w-3.5 h-3.5" />
            Report
          </button>

          {/* Related — discovery, subtle cards */}
          {related.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-medium mb-2.5">More from creator</p>
              <div className="grid grid-cols-2 gap-2">
                {related.slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => openModal(v.id)}
                    className="block w-full rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04] transition-colors duration-200 text-left"
                  >
                    <div className="aspect-video bg-white/5 relative">
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/25 text-xl">♪</div>
                      )}
                    </div>
                    <p className="p-2 text-[11px] font-medium text-white/80 line-clamp-2 leading-tight">{v.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
        style={{
          animation: closing ? 'performance-modal-out 0.2s ease-in forwards' : 'performance-modal-in 0.2s ease-out forwards',
        }}
        onClick={handleClose}
        aria-modal="true"
        role="dialog"
      >
        {loading ? (
          <div className="w-full max-w-[1200px] max-h-[90vh] aspect-video rounded-2xl bg-black/95 border border-white/[0.04] flex items-center justify-center">
            <div className="text-white/40 text-[14px] tracking-wide">Loading…</div>
          </div>
        ) : video ? (
          modalContent
        ) : (
          <div className="rounded-2xl bg-[#0a0a0c] border border-white/[0.04] px-8 py-6 text-center">
            <p className="text-white/60 text-[14px]">Performance not found.</p>
            <button type="button" onClick={handleClose} className="mt-4 text-[13px] text-white/50 hover:text-white/90 transition-colors duration-200">Close</button>
          </div>
        )}
      </div>

      {video && (
        <>
          <GiftModal
            isOpen={giftOpen}
            onClose={() => setGiftOpen(false)}
            videoId={video.id}
            videoTitle={video.title}
            creatorName={video.creator.displayName}
            giftContext={giftContext}
            onSent={(payload) => {
              setVideo((prev) =>
                prev
                  ? {
                      ...prev,
                      giftSummary: prev.giftSummary
                        ? { ...prev.giftSummary, totalCoinsReceived: payload.coinsCount, totalGiftsReceived: payload.giftsCount }
                        : { totalCoinsReceived: payload.coinsCount, totalGiftsReceived: payload.giftsCount, giftCountByType: [], topSupporters: [] },
                    }
                  : null
              );
              setSupportRefresh((n) => n + 1);
            }}
          />
          <SuperVoteModal
            isOpen={superVoteOpen}
            onClose={() => setSuperVoteOpen(false)}
            videoId={video.id}
            performerName={video.creator.displayName}
            onSuccess={(bal) => setWalletBalance(bal)}
          />
          <CommentsPanel
            isOpen={commentsOpen}
            onClose={() => {
              setCommentsOpen(false);
              fetchComments(video.id);
            }}
            comments={comments}
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
      )}
    </>
  );
}
