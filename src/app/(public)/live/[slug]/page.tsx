'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';
import { getChallengeDisplayStatus } from '@/lib/challenge-status';
import MicCheckModal from '@/components/live/MicCheckModal';
import LivePerformanceRulesModal from '@/components/live/LivePerformanceRulesModal';
import { LiveChallengeView } from '@/components/live/LiveChallengeView';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';

const LEADERBOARD_POLL_INTERVAL_MS = 10000;

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCountdown(target: Date): string {
  const end = target.getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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
  artistTheme?: string | null;
  startAt: string;
  endAt: string;
  /** DB challenge lifecycle (authoritative for “live phase”, distinct from a video stream). */
  status: string;
  liveEventAt?: string | null;
  liveStartAt?: string | null;
  windows?: ChallengeWindowData[];
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
};

export default function LiveEventPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [liveRulesOpen, setLiveRulesOpen] = useState(false);
  const [micCheckOpen, setMicCheckOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveSessionStatus, setLiveSessionStatus] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const loadLiveSession = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/live/challenges/${slug}/session`);
    const data = await res.json();
    if (data?.ok && data.sessionId) {
      setLiveSessionId(data.sessionId);
      setLiveSessionStatus(data.status ?? null);
    } else {
      setLiveSessionId(null);
      setLiveSessionStatus(null);
    }
  }, [slug]);

  const loadChallenge = useCallback(async () => {
    if (!slug) return null;
    const res = await fetch(`/api/challenges/${slug}`);
    const data = await res.json();
    if (res.status === 503) return { __unavailable: true as const };
    if (!data?.ok || !data.challenge) return null;
    return data.challenge as ChallengeData;
  }, [slug]);

  const loadLeaderboard = useCallback(async () => {
    if (!slug) return [];
    const res = await fetch(`/api/challenges/${slug}/ranking?limit=50`);
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.ranking)) return [];
    return data.ranking as LeaderboardEntry[];
  }, [slug]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setServiceUnavailable(false);
    const [ch, lb, _] = await Promise.all([loadChallenge(), loadLeaderboard(), loadLiveSession()]);
    if (ch && typeof ch === 'object' && '__unavailable' in ch) {
      setServiceUnavailable(true);
      setNotFound(false);
      setChallenge(null);
      setLeaderboard([]);
    } else if (!ch) {
      setNotFound(true);
      setChallenge(null);
      setLeaderboard([]);
    } else {
      setChallenge(ch);
      setLeaderboard(lb);
    }
    setLoading(false);
  }, [slug, loadChallenge, loadLeaderboard, loadLiveSession]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!challenge) return;
    const status = getChallengeDisplayStatus({
      startAt: new Date(challenge.startAt),
      endAt: new Date(challenge.endAt),
      liveStartAt: challenge.liveStartAt ? new Date(challenge.liveStartAt) : null,
    });
    const target =
      status === 'upcoming'
        ? new Date(challenge.liveStartAt || challenge.startAt)
        : status === 'active'
          ? new Date(challenge.liveStartAt || challenge.endAt)
          : new Date(challenge.endAt);
    const tick = () => setCountdown(formatCountdown(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge]);

  useEffect(() => {
    if (!challenge) return;
    const now = Date.now();
    const inScheduledWindow =
      challenge.windows?.some((w) => {
        const s = new Date(w.startsAt).getTime();
        const e = new Date(w.endsAt).getTime();
        return now >= s && now <= e;
      }) ?? false;
    const shouldPoll =
      challenge.status === 'LIVE_ACTIVE' ||
      inScheduledWindow ||
      liveSessionStatus === 'LIVE';
    if (!shouldPoll) return;
    const id = setInterval(async () => {
      const nextLeaderboard = await loadLeaderboard();
      setLeaderboard(nextLeaderboard);
    }, LEADERBOARD_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [challenge, liveSessionStatus, loadLeaderboard]);

  if (loading && !challenge) {
    return (
      <div
        className="min-h-screen pb-24 md:pb-12 flex items-center justify-center"
        style={{ backgroundColor: '#0D0D0E' }}
      >
        <p className="text-text-secondary text-[15px]">Loading live event…</p>
      </div>
    );
  }

  if (serviceUnavailable) {
    return (
      <div
        className="min-h-screen pb-24 md:pb-12 flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: '#0D0D0E' }}
      >
        <p className="text-text-primary font-semibold text-[18px]" role="alert">
          Service temporarily unavailable
        </p>
        <p className="text-text-secondary text-[15px] text-center max-w-md">
          We could not load this live page. Please try again shortly.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-primary inline-flex items-center gap-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notFound || !challenge) {
    return (
      <div
        className="min-h-screen pb-24 md:pb-12 flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: '#0D0D0E' }}
      >
        <p className="text-text-primary font-semibold text-[18px]">Live event not found</p>
        <p className="text-text-secondary text-[15px] text-center">
          This challenge may have ended or the link is incorrect.
        </p>
        <Link href="/challenges" className="btn-primary inline-flex items-center gap-2">
          View challenges
        </Link>
      </div>
    );
  }

  const timePhase = getChallengeDisplayStatus({
    startAt: new Date(challenge.startAt),
    endAt: new Date(challenge.endAt),
    liveStartAt: challenge.liveStartAt ? new Date(challenge.liveStartAt) : null,
  });

  const windowLiveNow =
    challenge.windows?.some((w) => {
      const now = Date.now();
      const s = new Date(w.startsAt).getTime();
      const e = new Date(w.endsAt).getTime();
      return now >= s && now <= e;
    }) ?? false;
  const livePhaseByData = challenge.status === 'LIVE_ACTIVE' || windowLiveNow;
  const useLiveChallengeView = liveSessionId && liveSessionStatus === 'LIVE';
  const sessionWaiting =
    !!liveSessionId && !!liveSessionStatus && liveSessionStatus !== 'LIVE';

  return (
    <div
      className="min-h-screen pb-24 md:pb-12 min-w-0 overflow-x-hidden relative"
      style={{
        backgroundColor: '#0D0D0E',
        ...(useLiveChallengeView && {
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,18,47,0.06) 0%, transparent 50%)',
        }),
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 laptop:px-8 py-6 md:py-8 relative">
        <Link
          href={`/challenges/${slug}`}
          className="inline-flex items-center gap-2 text-[13px] text-white/60 hover:text-white mb-6 transition-colors"
        >
          ← Back to challenge
        </Link>

        <header className={`mb-8 ${useLiveChallengeView ? 'mb-10' : ''}`}>
          <p className="text-[11px] uppercase tracking-widest text-white/50 font-medium mb-1.5">
            {challenge.artistTheme ? 'Weekly Live Cover Challenge' : 'Live Event'}
          </p>
          <h1 className="font-display text-[24px] md:text-[36px] laptop:text-[42px] font-bold text-white tracking-tight leading-tight mb-2">
            {challenge.title} Live
          </h1>
          {challenge.artistTheme && (
            <p className="text-[14px] text-accent font-medium">{challenge.artistTheme}</p>
          )}
          {useLiveChallengeView && (
            <p className="text-[13px] text-white/60 mt-2">Watch, vote, and support in real time</p>
          )}
        </header>

        {useLiveChallengeView ? (
          <LiveChallengeView sessionId={liveSessionId} challengeSlug={slug} />
        ) : (
        <>
        <section
          className="rounded-[24px] border overflow-hidden mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(26,26,28,0.95) 0%, rgba(18,18,22,0.98) 100%)',
            borderColor:
              useLiveChallengeView || livePhaseByData ? 'rgba(196,18,47,0.35)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="aspect-video flex flex-col items-center justify-center p-8 relative">
            {sessionWaiting ? (
              <div className="w-full max-w-[420px] text-center space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">Live session</p>
                <p className="text-white font-medium text-[16px]">Status: {liveSessionStatus}</p>
                <p className="text-white/55 text-[13px] leading-relaxed">
                  The interactive live show (voting, gifts, stage UI) only appears here when this session is LIVE.
                  There is no simulated broadcast player on this screen.
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-2 px-4 py-2 rounded-xl border border-white/15 text-[13px] font-medium text-white/85 hover:bg-white/[0.06] transition-colors"
                >
                  Refresh status
                </button>
              </div>
            ) : livePhaseByData && !liveSessionId ? (
              <div className="w-full max-w-[440px] text-center space-y-3 px-2">
                <p className="text-[11px] uppercase tracking-widest text-accent/80 font-semibold">
                  {windowLiveNow ? 'Scheduled window active' : 'Live phase'}
                </p>
                <p className="text-white/65 text-[13px] leading-relaxed">
                  This challenge is in a live phase or an active regional window, but there is no live session record
                  yet. Operators create the session; until it is LIVE, there is no stage UI or stream on this page.
                </p>
                {challenge.windows && challenge.windows.length > 0 && (
                  <div className="mt-4 w-full text-left">
                    <LiveWindowDisplay windows={challenge.windows} showEventTimezone variant="full" />
                  </div>
                )}
              </div>
            ) : timePhase === 'ended' ? (
              <p className="text-[15px] text-white/55">This challenge has ended.</p>
            ) : (
              <>
                <p className="text-[14px] text-white/60 mb-2">
                  {timePhase === 'upcoming' ? 'Starts in' : timePhase === 'active' ? 'Live show in' : 'Time remaining'}
                </p>
                <p className="font-display text-[32px] md:text-[48px] font-bold text-accent tabular-nums">
                  {countdown}
                </p>
                {challenge.windows && challenge.windows.length > 0 && (
                  <div className="mt-6 w-full max-w-[400px]">
                    <LiveWindowDisplay windows={challenge.windows} showEventTimezone variant="full" />
                  </div>
                )}
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveRulesOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/85 font-medium text-[13px] transition-colors border border-white/10"
                  >
                    Performer checklist (mic / rules)
                  </button>
                  <p className="text-[11px] text-white/40 max-w-[320px] text-center">
                    Opens guidance only — it does not start a broadcast.
                  </p>
                </div>
                <LivePerformanceRulesModal
                  isOpen={liveRulesOpen}
                  onClose={() => setLiveRulesOpen(false)}
                  onAccept={() => {
                    setLiveRulesOpen(false);
                    setMicCheckOpen(true);
                  }}
                />
                <MicCheckModal
                  isOpen={micCheckOpen}
                  onClose={() => setMicCheckOpen(false)}
                  onReady={() => setMicCheckOpen(false)}
                />
              </>
            )}
          </div>
        </section>

        <section
          className="rounded-[20px] border p-6 md:p-8"
          style={{
            background: 'rgba(26,26,28,0.72)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <h2 className="font-display text-[18px] md:text-[22px] font-semibold text-white mb-4">
            Live Leaderboard
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-white/50 text-[14px]">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 20).map((e) => (
                <div
                  key={e.videoId + String(e.rank)}
                  className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-white/50 w-6 tabular-nums shrink-0 font-medium">{e.rank}</span>
                  <span className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <span className="shrink-0" aria-hidden>
                      {e.countryFlag || getFlagEmoji(e.country)}
                    </span>
                    <Link
                      href={`/profile/${e.username}`}
                      className="font-medium text-white truncate hover:text-accent transition-colors"
                    >
                      {e.displayName}
                    </Link>
                  </span>
                  <span className="tabular-nums text-accent font-semibold shrink-0">
                    {formatScore(e.score)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href={`/challenges/${slug}`}
            className="inline-block mt-4 text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            View full challenge →
          </Link>
        </section>
        </>
        )}
      </div>
    </div>
  );
}
