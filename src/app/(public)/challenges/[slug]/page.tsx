'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';
import {
  ChallengeArenaHero,
  ChallengeArenaLeaderboardTable,
  ChallengeArenaParticipantStrip,
} from '@/components/challenge/arena';
import { ChallengeHeroBackdrop } from '@/components/challenge/ChallengeHeroBackdrop';
import { getFlagEmoji } from '@/lib/countries';
import { CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT, getLiveChallengeRecordingCapSec } from '@/constants/recording-modes';

function formatCountdown(endAt: string): string {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function daysLeft(endAt: string): number {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

type ChallengeWindowData = {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type ChallengeData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string; slug: string } | null;
  status: string;
  startAt: string;
  endAt: string;
  entryOpenAt?: string | null;
  entryCloseAt?: string | null;
  votingCloseAt?: string | null;
  prizeDescription: string | null;
  prizeCoins: number | null;
  rules: string[];
  entriesCount: number;
  artistTheme?: string | null;
  maxDurationSec?: number;
  liveEventAt?: string | null;
  windows?: ChallengeWindowData[];
  availableStyles?: Array<{ name: string; slug: string }> | null;
};

type LeaderboardEntry = {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl?: string | null;
  styleSlug?: string | null;
  score: number;
  votes: number;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  votesCount?: number;
  averageStars?: number;
  weightedVoteScore?: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  isFinalist?: boolean;
};

type RelatedChallenge = { slug: string; title: string; entriesCount: number };
type ArenaEntryStatus = {
  id: string;
  status: 'ACTIVE' | 'WITHDRAWN';
  joinedAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
  countryCode: string | null;
  windowId: string | null;
  videoId: string;
} | null;

export default function ChallengePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [relatedChallenges, setRelatedChallenges] = useState<RelatedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [arenaAuthenticated, setArenaAuthenticated] = useState(false);
  const [entryStatus, setEntryStatus] = useState<ArenaEntryStatus>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [participants, setParticipants] = useState<Array<{
    entryId: string;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    countryCode: string | null;
    status: string;
    joinedAt: string;
  }>>([]);
  const [participantsTotal, setParticipantsTotal] = useState(0);
  const [participantsCursor, setParticipantsCursor] = useState<string | null>(null);
  const [participantsLoadingMore, setParticipantsLoadingMore] = useState(false);
  const [entryActionLoading, setEntryActionLoading] = useState<'withdraw' | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setServiceUnavailable(false);
    Promise.all([
      fetch(`/api/challenges/${slug}`).then(async (r) => ({ status: r.status, body: await r.json() })),
      fetch(`/api/challenges/${slug}/ranking?limit=50`).then((r) => r.json()),
      fetch(`/api/challenges/${slug}/participants?limit=20`).then((r) => r.json()),
      fetch(`/api/challenges/${slug}/entry-status`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/challenges?limit=20').then((r) => r.json()),
      fetch(`/api/challenges/${slug}/votes/my-votes`).then((r) => (r.ok ? r.json() : { votes: {} })),
    ])
      .then(([chWrap, rankRes, participantsRes, entryStatusRes, listRes, myVotesRes]) => {
        if (chWrap.status === 503) {
          setServiceUnavailable(true);
          setNotFound(false);
          setChallenge(null);
          setLeaderboard([]);
          return;
        }
        const chRes = chWrap.body;
        if (!chRes?.ok || !chRes.challenge) {
          setNotFound(true);
          setChallenge(null);
          return;
        }
        setChallenge({
          ...chRes.challenge,
          rules: Array.isArray(chRes.challenge.rules) ? chRes.challenge.rules : [],
        });
        if (rankRes?.ok && Array.isArray(rankRes.ranking)) {
          setLeaderboard(rankRes.ranking);
        } else {
          setLeaderboard([]);
        }
        if (participantsRes?.ok && Array.isArray(participantsRes.participants)) {
          setParticipants(participantsRes.participants);
          setParticipantsTotal(typeof participantsRes.total === 'number' ? participantsRes.total : participantsRes.participants.length);
          setParticipantsCursor(typeof participantsRes.nextCursor === 'string' ? participantsRes.nextCursor : null);
        } else {
          setParticipants([]);
          setParticipantsTotal(0);
          setParticipantsCursor(null);
        }
        setEntryStatus(entryStatusRes?.entry ?? null);
        setCanJoin(!!entryStatusRes?.canJoin);
        setCanWithdraw(!!entryStatusRes?.canWithdraw);
        setArenaAuthenticated(!!entryStatusRes?.authenticated);
        if (listRes?.ok && Array.isArray(listRes.challenges)) {
          setRelatedChallenges(
            listRes.challenges
              .filter((c: { slug: string }) => c.slug !== slug)
              .slice(0, 4)
              .map((c: { slug: string; title: string; entriesCount: number }) => ({
                slug: c.slug,
                title: c.title,
                entriesCount: c.entriesCount ?? 0,
              }))
          );
        } else {
          setRelatedChallenges([]);
        }
        if (myVotesRes?.ok && myVotesRes.votes) {
          setMyVotes(myVotesRes.votes);
        } else {
          setMyVotes({});
        }
      })
      .catch(() => {
        setNotFound(true);
        setChallenge(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  if (loading && !challenge) {
    return (
      <div className="min-h-screen pb-24 md:pb-12 flex items-center justify-center" style={{ backgroundColor: '#0D0D0E' }}>
        <p className="text-text-secondary text-[15px]">Loading challenge…</p>
      </div>
    );
  }

  if (serviceUnavailable) {
    return (
      <div className="min-h-screen pb-24 md:pb-12 flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: '#0D0D0E' }}>
        <p className="text-text-primary font-semibold text-[18px]" role="alert">
          Service temporarily unavailable
        </p>
        <p className="text-text-secondary text-[15px] text-center max-w-md">
          We could not load this challenge. Please try again shortly.
        </p>
        <button
          type="button"
          onClick={() => load()}
          className="btn-primary inline-flex items-center gap-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notFound || !challenge) {
    return (
      <div className="min-h-screen pb-24 md:pb-12 flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: '#0D0D0E' }}>
        <p className="text-text-primary font-semibold text-[18px]">Challenge not found</p>
        <p className="text-text-secondary text-[15px] text-center">This challenge may have ended or the link is incorrect.</p>
        <Link href="/trending" className="btn-primary inline-flex items-center gap-2">View challenges</Link>
      </div>
    );
  }

  const c = challenge;
  const isCoverChallenge = !!c.artistTheme;
  const startDate = new Date(c.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endDate = new Date(c.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const countdown = formatCountdown(c.endAt);
  const daysLeftVal = daysLeft(c.endAt);
  const windows = (c.windows ?? []) as { id: string; regionLabel: string; timezone: string; startsAt: string; endsAt: string; status: string }[];
  const hasWindows = windows.length > 0;
  const nextWindow = hasWindows ? windows.find((w) => new Date(w.startsAt).getTime() > Date.now()) : null;
  const liveWindow = hasWindows ? windows.find((w) => {
    const now = Date.now();
    const s = new Date(w.startsAt).getTime();
    const e = new Date(w.endsAt).getTime();
    return now >= s && now <= e;
  }) : null;
  const liveEventCountdown = nextWindow ? formatCountdown(nextWindow.startsAt) : (liveWindow ? formatCountdown(liveWindow.endsAt) : (c.liveEventAt ? formatCountdown(c.liveEventAt) : null));
  const phaseLabel = (() => {
    if (['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED', 'ENDED', 'VOTING'].includes(c.status)) return 'Closed';
    if (['ENTRY_OPEN', 'OPEN'].includes(c.status)) return 'Accepting entries';
    if (c.status === 'ENTRY_CLOSED') return 'Entries closed';
    if (c.status === 'LIVE_UPCOMING') return 'Live upcoming';
    if (c.status === 'LIVE_ACTIVE') return liveWindow ? 'Regional window live' : 'Live phase';
    if (c.status === 'SCHEDULED') return 'Scheduled';
    return c.status;
  })();
  const isClosingSoon = c.status === 'ENTRY_OPEN' && daysLeftVal <= 2 && daysLeftVal > 0;
  /** Matches DB default when API omits field; cap = min(150, value) everywhere (upload, studio, entry). */
  const effectiveChallengeMaxSec = getLiveChallengeRecordingCapSec(
    typeof c.maxDurationSec === 'number' ? c.maxDurationSec : CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT
  );
  const topGenre = c.category?.name ?? '—';
  const topStyle = leaderboard.find((e) => e.styleSlug)?.styleSlug ?? null;
  const currentLeader = leaderboard[0];
  const yourRank =
    entryStatus?.status === 'ACTIVE'
      ? leaderboard.find((e) => e.videoId === entryStatus.videoId)?.rank ?? null
      : null;
  const highlightVideoId = entryStatus?.status === 'ACTIVE' ? entryStatus.videoId : null;
  const nextWindowStartsLabel =
    !liveWindow && nextWindow ? formatCountdown(nextWindow.startsAt) : null;
  const handleLoadMoreParticipants = async () => {
    if (!participantsCursor || participantsLoadingMore) return;
    setParticipantsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/challenges/${slug}/participants?limit=20&cursor=${encodeURIComponent(participantsCursor)}`
      );
      const data = await response.json();
      if (data?.ok && Array.isArray(data.participants)) {
        setParticipants((prev) => [...prev, ...data.participants]);
        setParticipantsCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
        if (typeof data.total === 'number') setParticipantsTotal(data.total);
      }
    } finally {
      setParticipantsLoadingMore(false);
    }
  };

  const handleWithdrawArena = async () => {
    setEntryActionLoading('withdraw');
    try {
      const response = await fetch(`/api/challenges/${slug}/withdraw`, {
        method: 'POST',
      });
      if (response.ok) {
        load();
      }
    } finally {
      setEntryActionLoading(null);
    }
  };
  const defaultRules = isCoverChallenge
    ? [
        'One performance per creator per challenge.',
        `Maximum ${effectiveChallengeMaxSec} seconds per performance.`,
        `Perform a cover of a song by or associated with ${c.artistTheme}.`,
        'Choose your performance style (Pop, R&B, Soul, Gospel, Jazz, etc.).',
        'No lip-sync or fake playback. Submit a real vocal (or instrumental) performance. Submissions may be reviewed for authenticity.',
      ]
    : [
        'One performance per creator per challenge.',
        `Maximum ${effectiveChallengeMaxSec} seconds. Shorter clips are welcome.`,
        'Performance must match the challenge theme.',
        'No lip-sync or fake playback. Submit a real vocal (or instrumental) performance. Submissions may be reviewed for authenticity.',
      ];
  const rules = c.rules.length > 0 ? c.rules : defaultRules;

  return (
    <div className="min-h-screen pb-24 md:pb-12 min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      {/* 1. CHALLENGE HERO — stage photo + lights (same language as /trending); #1 entry thumbnail when available */}
      <ChallengeHeroBackdrop
        imageUrl={currentLeader?.thumbnailUrl ?? null}
        className="flex flex-col justify-end px-4 md:px-6 laptop:px-8 pt-6 md:pt-8 laptop:pt-12 pb-6 md:pb-8 laptop:pb-10 min-h-[260px] md:min-h-[340px] laptop:min-h-[400px] rounded-b-2xl md:rounded-b-3xl"
      >
        <header className="w-full max-w-[1200px] mx-auto min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              {isCoverChallenge ? 'Weekly Live Cover Challenge' : 'Weekly Challenge'}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${
                ['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status)
                  ? 'bg-white/10 text-white/70 border border-white/10'
                  : ['ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE'].includes(c.status)
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-accent/15 text-accent border border-accent/25'
              }`}
            >
              {phaseLabel}
            </span>
            {isClosingSoon && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Closing soon
              </span>
            )}
          </div>
          <h1 className="font-display text-[24px] md:text-[36px] laptop:text-[42px] lg:text-[48px] font-bold text-white tracking-tight leading-tight max-w-[720px] mb-2 laptop:mb-3 truncate">
            {c.title}
          </h1>
          {isCoverChallenge && c.artistTheme && (
            <p className="text-[13px] md:text-[14px] text-accent font-medium mb-1">
              Perform covers from {c.artistTheme} · Choose your style
            </p>
          )}
          <p className="text-[13px] md:text-[15px] laptop:text-[16px] text-white/70 max-w-[560px] mb-2 line-clamp-2">
            {c.description ?? 'Share your performance and compete for the top spot.'}
          </p>
          <p className="text-[12px] laptop:text-[13px] text-white/50 mb-3 laptop:mb-4">
            {startDate} – {endDate}
            {!['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) && (
              <> · Ends in <span className="font-semibold text-white">{countdown}</span></>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            {['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? (
              <>
                <Link
                  href="#arena-leaderboard"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors shadow-[0_10px_30px_rgba(177,18,38,0.35)]"
                >
                  View leaderboard
                </Link>
                <a
                  href="#arena-leaderboard"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:bg-white/10 transition-colors"
                >
                  Watch entries
                </a>
              </>
            ) : (
              <>
                <Link
                  href={`/upload?challenge=${encodeURIComponent(slug)}`}
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors shadow-[0_10px_30px_rgba(177,18,38,0.35)]"
                >
                  Join Challenge
                </Link>
                <a
                  href="#arena-leaderboard"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:bg-white/10 transition-colors"
                >
                  Watch entries
                </a>
              </>
            )}
          </div>
        </header>
      </ChallengeHeroBackdrop>

      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 laptop:px-8 -mt-2 relative z-10 min-w-0">
        {/* 2. CHALLENGE SUMMARY STRIP */}
        <section
          className="rounded-[20px] border overflow-hidden mb-5 laptop:mb-6"
          style={{
            background: 'rgba(26,26,28,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] min-w-0">
            <div className="bg-[rgba(18,20,26,0.6)] p-3 md:p-4 laptop:py-5 laptop:px-5 min-h-[76px] laptop:min-h-[88px] flex flex-col justify-center min-w-0 overflow-hidden">
              <p className="text-[10px] laptop:text-[11px] uppercase tracking-wider text-white/50 font-medium truncate">Arena entries</p>
              <p className="text-[18px] md:text-[22px] laptop:text-[24px] font-semibold text-white tabular-nums mt-0.5 truncate">{participantsTotal.toLocaleString()}</p>
            </div>
            <div className="bg-[rgba(18,20,26,0.6)] p-3 md:p-4 laptop:py-5 laptop:px-5 min-h-[76px] laptop:min-h-[88px] flex flex-col justify-center min-w-0 overflow-hidden">
              <p className="text-[10px] laptop:text-[11px] uppercase tracking-wider text-white/50 font-medium truncate">
                {['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? 'Ended' : 'Days left'}
              </p>
                <p className={`text-[18px] md:text-[22px] laptop:text-[24px] font-semibold tabular-nums mt-0.5 ${['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? 'text-white/60' : 'text-accent'}`}>
                {['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? '—' : daysLeftVal}
              </p>
            </div>
            <div className="bg-[rgba(18,20,26,0.6)] p-3 md:p-4 laptop:py-5 laptop:px-5 min-h-[76px] laptop:min-h-[88px] flex flex-col justify-center min-w-0 overflow-hidden">
              <p className="text-[10px] laptop:text-[11px] uppercase tracking-wider text-white/50 font-medium truncate">
                {isCoverChallenge ? 'Top style' : 'Top genre'}
              </p>
              <p className="text-[15px] md:text-[17px] laptop:text-[18px] font-semibold text-white mt-0.5 truncate">
                {isCoverChallenge && topStyle ? (c.availableStyles?.find((s) => s.slug === topStyle)?.name ?? topStyle) : topGenre}
              </p>
            </div>
            <div className="bg-[rgba(18,20,26,0.6)] p-3 md:p-4 laptop:py-5 laptop:px-5 min-h-[76px] laptop:min-h-[88px] flex flex-col justify-center min-w-0 overflow-hidden">
              <p className="text-[10px] laptop:text-[11px] uppercase tracking-wider text-white/50 font-medium truncate">Current leader</p>
              <p className="text-[15px] md:text-[17px] laptop:text-[18px] font-semibold text-white mt-0.5 flex items-center gap-1.5 min-w-0 overflow-hidden">
                {currentLeader ? (
                  <>
                    <span aria-hidden className="shrink-0">{currentLeader.countryFlag || getFlagEmoji(currentLeader.country)}</span>
                    <span className="truncate">{currentLeader.displayName}</span>
                  </>
                ) : (
                  <span className="text-white/50 italic">No entries yet</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* 3. PREMIUM ARENA HUB — real APIs only */}
        <section
          className="rounded-[24px] border p-5 md:p-7 laptop:p-8 mb-5 laptop:mb-7 space-y-8 laptop:space-y-10"
          style={{
            background: 'rgba(20,20,24,0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: 'rgba(255,255,255,0.07)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 48px rgba(0,0,0,0.35)',
          }}
        >
          <ChallengeArenaHero
            slug={slug}
            title={c.title}
            categoryName={topGenre}
            artistTheme={c.artistTheme ?? null}
            isCoverChallenge={isCoverChallenge}
            challengeStatus={c.status}
            phaseLabel={phaseLabel}
            isClosingSoon={isClosingSoon}
            participantsTotal={participantsTotal}
            windows={windows}
            liveEventAt={c.liveEventAt ?? null}
            challengeEndsIn={
              !['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? countdown : null
            }
            scheduleLiveNow={!!liveWindow}
            nextWindowStartsIn={nextWindowStartsLabel}
            entryStatus={entryStatus}
            canJoin={canJoin}
            canWithdraw={canWithdraw}
            arenaAuthenticated={arenaAuthenticated}
            entryActionLoading={entryActionLoading}
            onWithdraw={handleWithdrawArena}
            yourRank={yourRank}
            effectiveChallengeMaxSec={effectiveChallengeMaxSec}
          />

          <ChallengeArenaLeaderboardTable rows={leaderboard} highlightVideoId={highlightVideoId} />

          <ChallengeArenaParticipantStrip
            participants={participants}
            participantsTotal={participantsTotal}
            slug={slug}
            onLoadMore={handleLoadMoreParticipants}
            hasMore={!!participantsCursor}
            loadingMore={participantsLoadingMore}
          />
        </section>

        {/* 4. RULES BLOCK */}
        <section
          className="rounded-[20px] border p-6 md:p-8 mb-5 laptop:mb-6"
          style={{
            background: 'rgba(26,26,28,0.72)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="font-display text-[18px] md:text-[20px] font-semibold text-white mb-4">
            Rules
          </h2>
          <ul className="space-y-2.5 text-[14px] text-white/70 list-disc list-inside">
            {rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </section>

        {/* 4b. RANKING EXPLANATION CARD */}
        <section
          className="rounded-[20px] border p-5 md:p-6 mb-5 laptop:mb-6"
          style={{
            background: 'rgba(26,26,28,0.5)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <h3 className="font-display text-[15px] md:text-[16px] font-semibold text-white mb-2">
            How ranking works
          </h3>
          <p className="text-[13px] text-white/70 leading-relaxed">
            Performances are ranked by community votes and engagement. Vote for your favorites using the star rating. Higher scores and more votes move entries up the leaderboard. The top performers are featured and may win prizes.
          </p>
        </section>

        {/* 5. CHALLENGE ENTRIES GRID — only when entries exist */}
        {leaderboard.length > 0 && (
          <section className="mb-8 laptop:mb-10 min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 laptop:gap-4 mb-4 laptop:mb-5">
              <div className="min-w-0">
                <h2 className="font-display text-[18px] md:text-[22px] laptop:text-[24px] font-semibold text-white truncate">
                  Performances
                </h2>
                <p className="text-[12px] text-white/45 mt-1">
                  Same ranking API and order as the arena table for this page load · vote on each card
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {leaderboard.map((e) => (
                <div key={e.videoId} className="w-full max-w-[260px] mx-auto">
                  <VideoCard
                    id={e.videoId}
                    title={e.videoTitle}
                    thumbnailUrl={e.thumbnailUrl}
                    creator={{
                      id: e.creatorId,
                      displayName: e.displayName,
                      username: e.username,
                      country: e.country ?? undefined,
                      avatarUrl: e.avatarUrl ?? undefined,
                    }}
                    visibility={e.visibility}
                    stats={{
                      likesCount: e.likesCount,
                      viewsCount: e.viewsCount,
                      commentsCount: e.commentsCount,
                      votesCount: e.votes,
                    }}
                    challengeName={c.title}
                    cardSize="discovery"
                    challengeRank={e.rank}
                    challengeSlug={slug}
                    challengeVote={{
                      votesCount: e.votesCount ?? 0,
                      averageStars: e.averageStars ?? 0,
                      myStars: myVotes[e.videoId] ?? null,
                    }}
                    onChallengeVoteSuccess={(vid, stars) => setMyVotes((prev) => ({ ...prev, [vid]: stars }))}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. WEEKLY LIVE CHALLENGE TEASER */}
        <section
          className="rounded-[24px] border overflow-hidden p-6 md:p-8 mb-8 laptop:mb-10"
          style={{
            background: 'linear-gradient(135deg, rgba(26,26,28,0.9) 0%, rgba(18,18,22,0.95) 100%)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-accent/90 font-medium mb-2">
            Live event
          </p>
          <h3 className="font-display text-[22px] md:text-[26px] font-semibold text-white mb-2">
            {c.artistTheme ? `${c.artistTheme} Week Live Show` : 'Weekly Live Challenge Show'}
          </h3>
          {hasWindows ? (
            <div className="mb-4">
              <LiveWindowDisplay windows={windows} showEventTimezone variant="full" />
              {liveEventCountdown && (
                <p className="text-[14px] text-white/50 mt-3">
                  Countdown: <span className="font-semibold text-accent">{liveEventCountdown}</span>
                </p>
              )}
            </div>
          ) : c.liveEventAt ? (
            <>
              <p className="text-[15px] text-white/60 mb-2">
                {new Date(c.liveEventAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} (your time)
              </p>
              <p className="text-[14px] text-white/50 mb-4">
                Countdown: <span className="font-semibold text-accent">{liveEventCountdown ?? formatCountdown(c.liveEventAt)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] text-white/60 mb-2">
                No live event scheduled for this challenge
              </p>
              <p className="text-[14px] text-white/50 mb-4">
                {['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED'].includes(c.status) ? 'This challenge has ended.' : <>Challenge ends in <span className="font-semibold text-accent">{formatCountdown(c.votingCloseAt ?? c.endAt)}</span></>}
              </p>
            </>
          )}
          {currentLeader && (
            <p className="text-[13px] text-white/50 mb-4 min-w-0 overflow-hidden truncate">
              Featuring: {currentLeader.displayName}
              {leaderboard[1] && `, ${leaderboard[1].displayName}`}
              {leaderboard[2] && `, ${leaderboard[2].displayName}`}
            </p>
          )}
          <div className="flex flex-wrap gap-3 flex-col items-start">
            <Link
              href={`/live/${slug}`}
              className={`inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-[15px] transition-colors ${
                hasWindows || c.liveEventAt
                  ? 'text-white bg-accent hover:bg-accent-hover'
                  : 'text-white/85 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1]'
              }`}
            >
              Open live page
            </Link>
            {!hasWindows && !c.liveEventAt && (
              <p className="text-[12px] text-white/45 max-w-md">
                No regional windows or fixed live datetime on this challenge — the live page shows schedule truthfully and may be minimal.
              </p>
            )}
          </div>
        </section>

        {/* 7. RELATED CHALLENGES */}
        <section className="min-w-0 overflow-hidden pt-2">
          <h2 className="font-display text-[18px] md:text-[22px] laptop:text-[24px] font-semibold text-white mb-4 laptop:mb-5">
            Related challenges
          </h2>
          {relatedChallenges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 laptop:gap-4">
            {relatedChallenges.map((r) => (
              <Link
                key={r.slug}
                href={`/challenges/${r.slug}`}
                className="block rounded-[20px] border p-5 transition-all hover:border-accent/30 hover:shadow-[0_8px_28px_rgba(0,0,0,0.3)] min-w-0 overflow-hidden"
                style={{
                  background: 'rgba(26,26,28,0.72)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <p className="font-display text-[17px] font-semibold text-white tracking-tight truncate">
                  {r.title}
                </p>
                <p className="text-[13px] text-white/50 mt-1">{r.entriesCount.toLocaleString()} entries</p>
              </Link>
            ))}
          </div>
          ) : (
            <div
              className="rounded-[20px] border border-white/[0.08] flex flex-col items-center justify-center py-10 px-6 text-center"
              style={{ background: 'rgba(26,26,28,0.5)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[15px] font-medium text-white/90 mb-1">No other challenges right now</p>
              <p className="text-[13px] text-white/60 max-w-[340px]">
                New challenges open regularly. Check back soon or browse the challenges page.
              </p>
              <Link href="/challenges" className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-xl text-[14px] font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors">
                Browse Challenges
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
