'use client';

/**
 * Live Challenge — premium show experience
 * Responsiveness: optimistic UI, instant feedback
 * Visual feedback: vote burst, gift celebration, rank highlights
 * Emotional engagement: stage framing, top performer spotlight
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';
import { LIVE_POLL_INTERVAL_MS } from '@/constants/live-challenge';

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCountdown(endTime: Date | null): string {
  if (!endTime) return '—';
  const diff = Math.max(0, endTime.getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function countdownSecondsLeft(endTime: Date | null): number {
  if (!endTime) return 999;
  return Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
}

type LeaderboardEntry = {
  rank: number;
  performerUserId: string;
  performer: { username: string; displayName: string; avatarUrl: string | null; country: string | null };
  video: { id: string; title: string; thumbnailUrl: string | null } | null;
  votesCount: number;
  averageStars: number;
  giftCoins: number;
  liveScore: number;
  slotStatus: string;
};

type SessionState = {
  id: string;
  status: string;
  currentPerformerId: string | null;
  currentSlot: {
    performer: { username: string; displayName: string; country: string | null };
    video: { id: string; videoUrl: string | null; thumbnailUrl: string | null } | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
};

const QUICK_GIFTS = [10, 25, 50, 100];

export function LiveChallengeView({
  sessionId,
  challengeSlug,
}: {
  sessionId: string;
  challengeSlug: string;
}) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [giftLoading, setGiftLoading] = useState<string | null>(null);
  const [voteBurstStar, setVoteBurstStar] = useState<number | null>(null);
  const [giftCelebration, setGiftCelebration] = useState(false);
  const [countdownSec, setCountdownSec] = useState(999);

  const load = useCallback(async () => {
    const res = await fetch(`/api/live/sessions/${sessionId}`);
    const data = await res.json();
    if (!data?.ok) return;
    setSession(data.session);
    setLeaderboard(data.leaderboard ?? []);
  }, [sessionId]);

  useEffect(() => {
    load();
    const id = setInterval(load, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/live/sessions/${sessionId}/stream`);
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.leaderboard) setLeaderboard(d.leaderboard);
        } catch {
          // ignore
        }
      };
    } catch {
      // SSE not supported, polling only
    }
    return () => es?.close();
  }, [sessionId]);

  // Countdown tick + urgency
  useEffect(() => {
    if (!session?.currentSlot?.endTime) return;
    const end = new Date(session.currentSlot.endTime);
    const tick = () => setCountdownSec(countdownSecondsLeft(end));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.currentSlot?.endTime]);

  const handleVote = async (stars: number) => {
    if (!session?.currentPerformerId) return;
    setMyVote(stars);
    setVoteBurstStar(stars);
    setTimeout(() => setVoteBurstStar(null), 400);
    setVoteLoading(true);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performerUserId: session.currentPerformerId, stars }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setMyVote(null);
        // Session may have advanced to the next performer between click and request.
        await load();
      }
    } finally {
      setVoteLoading(false);
    }
  };

  const handleGift = async (coins: number) => {
    if (!session?.currentPerformerId) return;
    setGiftLoading(`${coins}`);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performerUserId: session.currentPerformerId, coins }),
      });
      const data = await res.json();
      if (data?.ok) {
        setGiftCelebration(true);
        setTimeout(() => setGiftCelebration(false), 600);
      } else {
        // Refresh current session target on stale-slot rejection.
        await load();
      }
    } finally {
      setGiftLoading(null);
    }
  };

  if (!session) return null;

  const isLive = session.status === 'LIVE';
  const endTime = session.currentSlot?.endTime
    ? new Date(session.currentSlot.endTime)
    : null;

  const isCountdownUrgent = countdownSec > 0 && countdownSec <= 30;

  return (
    <div className="flex flex-col gap-6">
      {/* Stage — cinematic framing */}
      <section
        className="rounded-[24px] border overflow-hidden transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(26,26,28,0.95) 0%, rgba(18,18,22,0.98) 100%)',
          borderColor: isLive ? 'rgba(196,18,47,0.5)' : 'rgba(255,255,255,0.08)',
          boxShadow: isLive ? '0 0 40px rgba(196,18,47,0.08), 0 24px 60px rgba(0,0,0,0.4)' : undefined,
        }}
      >
        <div className="aspect-video flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Stage glow overlay */}
          {isLive && (
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent z-[1]"
              style={{ opacity: 0.5 }}
            />
          )}
          {session.currentSlot?.video?.videoUrl && (
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
          )}
          {isLive && (
            <>
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full live-badge-pulse transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(196,18,47,0.95) 0%, rgba(177,18,38,0.9) 100%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 4px 16px rgba(196,18,47,0.35)',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[13px] font-bold text-white tracking-wide">LIVE</span>
                </div>
                {endTime && (
                  <div
                    className={`px-4 py-2 rounded-full font-mono text-[15px] font-semibold tabular-nums transition-all duration-300 ${
                      isCountdownUrgent
                        ? 'bg-red-500/30 text-red-200 border border-red-400/40 animate-pulse'
                        : 'bg-black/70 text-white border border-white/10'
                    }`}
                  >
                    {formatCountdown(endTime)}
                  </div>
                )}
              </div>
              {session.currentSlot?.performer && (
                <div className="absolute bottom-4 left-4 right-4 text-left z-10">
                  <div
                    className="inline-block px-4 py-2 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-white font-bold text-[17px] drop-shadow-sm">
                      {session.currentSlot.performer.displayName}
                      {session.currentSlot.performer.country && (
                        <span className="ml-2" aria-hidden>
                          {getFlagEmoji(session.currentSlot.performer.country)}
                        </span>
                      )}
                    </p>
                    <p className="text-white/70 text-[12px] uppercase tracking-wider mt-0.5">Now performing</p>
                  </div>
                </div>
              )}
            </>
          )}
          {session.currentSlot?.video?.videoUrl ? (
            <video
              src={session.currentSlot.video.videoUrl}
              className="absolute inset-0 w-full h-full object-contain z-0"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 relative z-[2]">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-300"
                style={{
                  background: 'radial-gradient(circle, rgba(196,18,47,0.25) 0%, rgba(196,18,47,0.08) 100%)',
                  border: '2px solid rgba(196,18,47,0.3)',
                  boxShadow: '0 0 40px rgba(196,18,47,0.15)',
                }}
              >
                <span className="text-5xl">🎤</span>
              </div>
              <p className="text-white/80 text-[15px] font-medium">Performance stream</p>
            </div>
          )}
        </div>

        {/* Voting panel — one-tap, instant feedback */}
        {isLive && session.currentPerformerId && (
          <div
            className="p-5 border-t border-white/[0.06] relative"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <p className="text-[11px] uppercase tracking-[0.15em] text-white/60 mb-3 font-medium">Rate this performance</p>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleVote(s)}
                  disabled={voteLoading}
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-bold text-[18px] sm:text-[20px]
                    transition-all duration-200 active:scale-95
                    select-none touch-manipulation
                    ${voteBurstStar === s ? 'vote-star-burst' : ''}
                    ${myVote === s
                      ? 'bg-accent text-white shadow-[0_0_24px_rgba(196,18,47,0.5)] scale-110'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white hover:scale-105'
                    }
                  `}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick gifts — celebration feedback */}
        {isLive && session.currentPerformerId && (
          <div
            className="p-5 border-t border-white/[0.06] relative overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            {giftCelebration && (
              <div
                className="gift-celebration-flash absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  background: 'radial-gradient(circle, rgba(196,18,47,0.2) 0%, transparent 70%)',
                }}
              >
                <span className="text-4xl">✨</span>
              </div>
            )}
            <p className="text-[11px] uppercase tracking-[0.15em] text-white/60 mb-3 font-medium">Send support</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_GIFTS.map((coins) => (
                <button
                  key={coins}
                  type="button"
                  onClick={() => handleGift(coins)}
                  disabled={!!giftLoading}
                  className="
                    px-5 py-2.5 rounded-xl text-[14px] font-semibold
                    transition-all duration-200 active:scale-95
                    touch-manipulation
                    bg-white/10 hover:bg-accent/40 text-white
                    border border-white/10 hover:border-accent/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {giftLoading === `${coins}` ? '…' : `${coins} coins`}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Live leaderboard — top 3 spotlight */}
      <section
        className="rounded-[24px] border p-6 transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(28,28,32,0.9) 0%, rgba(22,22,26,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <h2 className="font-display text-[20px] font-semibold text-white mb-1">
          Live Leaderboard
        </h2>
        <p className="text-[12px] text-white/50 mb-4">Updates in real time</p>
        {leaderboard.length === 0 ? (
          <p className="text-white/50 text-[14px] py-8 text-center">No votes yet. Be the first to rate!</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 15).map((e) => {
              const isTop3 = e.rank <= 3;
              const rankStyle =
                e.rank === 1
                  ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-400/30'
                  : e.rank === 2
                    ? 'bg-gradient-to-br from-slate-400/25 to-slate-500/15 border-slate-400/25'
                    : e.rank === 3
                      ? 'bg-gradient-to-br from-amber-700/30 to-amber-800/20 border-amber-600/25'
                      : '';
              return (
                <div
                  key={e.performerUserId}
                  className={`
                    flex items-center justify-between gap-4 py-3 px-4 rounded-xl
                    transition-all duration-300
                    ${isTop3 ? `border ${rankStyle}` : 'hover:bg-white/[0.04]'}
                  `}
                >
                  <span
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[14px] tabular-nums
                      ${e.rank === 1 ? 'text-amber-400' : e.rank === 2 ? 'text-slate-300' : e.rank === 3 ? 'text-amber-600' : 'text-white/50'}
                    `}
                  >
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                  </span>
                  <span className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
                    <span className="shrink-0 text-lg" aria-hidden>
                      {e.performer.country ? getFlagEmoji(e.performer.country) : '🌍'}
                    </span>
                    <Link
                      href={`/profile/${e.performer.username}`}
                      className={`font-medium truncate hover:text-accent transition-colors ${
                        isTop3 ? 'text-white' : 'text-white/90'
                      }`}
                    >
                      {e.performer.displayName}
                    </Link>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] text-white/50">
                      ★ {e.averageStars.toFixed(1)} · {e.votesCount}
                      {e.giftCoins > 0 && (
                        <span className="text-accent/80 ml-1">· {formatScore(e.giftCoins)}</span>
                      )}
                    </span>
                    <span
                      className={`tabular-nums font-bold min-w-[2.5rem] text-right ${
                        isTop3 ? 'text-accent' : 'text-accent/90'
                      }`}
                    >
                      {formatScore(e.liveScore)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <Link
          href={`/challenges/${challengeSlug}`}
          className="inline-flex items-center gap-2 mt-5 text-[14px] font-medium text-accent hover:text-accent-hover transition-colors"
        >
          View full challenge →
        </Link>
      </section>
    </div>
  );
}
