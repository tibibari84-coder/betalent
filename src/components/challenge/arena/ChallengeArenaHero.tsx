'use client';

import Link from 'next/link';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';

export type ArenaHeroWindow = {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type Props = {
  slug: string;
  /** Challenge title — shown as primary headline */
  title: string;
  categoryName: string;
  artistTheme: string | null;
  isCoverChallenge: boolean;
  challengeStatus: string;
  phaseLabel: string;
  isClosingSoon: boolean;
  /** Real participant count (active entries) from participants API or challenge.entriesCount */
  participantsTotal: number;
  windows: ArenaHeroWindow[];
  liveEventAt: string | null;
  /** Countdown helper text for challenge end */
  challengeEndsIn: string | null;
  /** True when any window is currently within [startsAt, endsAt] — schedule-based, not a fake broadcast flag */
  scheduleLiveNow: boolean;
  nextWindowStartsIn: string | null;
  entryStatus: {
    status: 'ACTIVE' | 'WITHDRAWN';
    joinedAt: string;
    videoId: string;
  } | null;
  canJoin: boolean;
  canWithdraw: boolean;
  arenaAuthenticated: boolean;
  entryActionLoading: 'withdraw' | null;
  onWithdraw: () => void;
  /** Logged-in creator's rank from real ranking rows; null if not entered or not on board */
  yourRank: number | null;
  effectiveChallengeMaxSec: number;
};

function isChallengeTerminal(status: string) {
  return ['WINNERS_LOCKED', 'ARCHIVED', 'VOTING_CLOSED', 'VOTING', 'ENDED'].includes(status);
}

export function ChallengeArenaHero({
  slug,
  title,
  categoryName,
  artistTheme,
  isCoverChallenge,
  challengeStatus,
  phaseLabel,
  isClosingSoon,
  participantsTotal,
  windows,
  liveEventAt,
  challengeEndsIn,
  scheduleLiveNow,
  nextWindowStartsIn,
  entryActionLoading,
  onWithdraw,
  entryStatus,
  canJoin,
  canWithdraw,
  arenaAuthenticated,
  yourRank,
  effectiveChallengeMaxSec,
}: Props) {
  const terminal = isChallengeTerminal(challengeStatus);
  const entryOpen = challengeStatus === 'ENTRY_OPEN' || challengeStatus === 'OPEN';
  const hasWindows = windows.length > 0;
  const loginHref = `/login?next=${encodeURIComponent(`/challenges/${slug}`)}`;

  const primaryCta = (() => {
    if (terminal) {
      return (
        <span className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] bg-white/[0.06] text-white/45 border border-white/[0.08] cursor-default">
          Closed
        </span>
      );
    }
    if (!entryOpen) {
      return (
        <span className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] bg-white/[0.06] text-white/55 border border-white/[0.08] cursor-default">
          Entries closed
        </span>
      );
    }
    if (!arenaAuthenticated) {
      return (
        <Link
          href={loginHref}
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors duration-200 shadow-[0_0_28px_rgba(196,18,47,0.22)]"
        >
          Sign in to join
        </Link>
      );
    }
    if (entryStatus?.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] bg-white/[0.1] text-white border border-white/[0.14]">
          Joined
        </span>
      );
    }
    if (canJoin) {
      return (
        <Link
          href={`/upload?challenge=${encodeURIComponent(slug)}`}
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors duration-200 shadow-[0_0_28px_rgba(196,18,47,0.22)]"
        >
          Join challenge
        </Link>
      );
    }
    return (
      <span className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] bg-white/[0.06] text-white/45 border border-white/[0.08] cursor-default">
        Unavailable
      </span>
    );
  })();

  return (
    <section
      className="relative overflow-hidden rounded-[24px] border mb-5 laptop:mb-7"
      style={{
        background:
          'linear-gradient(145deg, rgba(28,22,24,0.92) 0%, rgba(18,16,20,0.88) 45%, rgba(14,13,16,0.95) 100%)',
        borderColor: 'rgba(255,255,255,0.09)',
        boxShadow: '0 0 0 1px rgba(196,18,47,0.06), 0 24px 64px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(196,18,47,0.16) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(212,175,55,0.06) 0%, transparent 45%)',
        }}
      />
      <div className="relative p-5 md:p-7 laptop:p-8 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/45 font-semibold">
            Weekly live challenge arena
          </p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              terminal
                ? 'bg-white/10 text-white/60 border border-white/10'
                : 'bg-accent/15 text-accent border border-accent/25'
            }`}
          >
            {phaseLabel}
          </span>
          {scheduleLiveNow && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Regional window active
            </span>
          )}
          {!scheduleLiveNow && challengeStatus === 'LIVE_ACTIVE' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/65 border border-white/12">
              Live phase (no window now)
            </span>
          )}
          {isClosingSoon && !terminal && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25">
              Closing soon
            </span>
          )}
        </div>

        <div className="flex flex-col laptop:flex-row laptop:items-end laptop:justify-between gap-6 min-w-0">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1 min-w-0">
              <h2 className="font-display text-[22px] md:text-[28px] laptop:text-[32px] font-bold text-white tracking-tight leading-tight line-clamp-2">
                {title}
              </h2>
              <p className="text-[13px] text-white/50 font-medium truncate">
                {categoryName}
                {isCoverChallenge && artistTheme ? ` · ${artistTheme}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border"
                style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <span className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">Entered</span>
                <span className="font-display text-[22px] md:text-[26px] font-bold text-white tabular-nums">
                  {participantsTotal.toLocaleString()}
                </span>
              </div>
              {arenaAuthenticated && yourRank !== null && (
                <div
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-accent/25"
                  style={{ background: 'rgba(196,18,47,0.08)' }}
                >
                  <span className="text-[11px] uppercase tracking-wider text-accent/90 font-semibold">Your rank</span>
                  <span className="font-display text-[22px] md:text-[26px] font-bold text-white tabular-nums">
                    #{yourRank}
                  </span>
                </div>
              )}
            </div>

            {hasWindows ? (
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 md:p-4">
                <LiveWindowDisplay windows={windows} showEventTimezone variant="full" />
                {nextWindowStartsIn && !scheduleLiveNow && (
                  <p className="text-[13px] text-white/50 mt-3">
                    Next window in <span className="font-semibold text-accent">{nextWindowStartsIn}</span>
                  </p>
                )}
              </div>
            ) : liveEventAt ? (
              <p className="text-[14px] text-white/55">
                Live show:{' '}
                <span className="text-white/85 font-medium">
                  {new Date(liveEventAt).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {nextWindowStartsIn && (
                  <span className="text-white/45">
                    {' '}
                    · starts in <span className="text-accent font-semibold">{nextWindowStartsIn}</span>
                  </span>
                )}
              </p>
            ) : (
              challengeEndsIn && (
                <p className="text-[14px] text-white/55">
                  Challenge timeline: ends in <span className="font-semibold text-accent">{challengeEndsIn}</span>
                </p>
              )
            )}

            {entryStatus?.status === 'ACTIVE' && (
              <p className="text-[12px] text-white/40">
                Joined {new Date(entryStatus.joinedAt).toLocaleString()} · max {effectiveChallengeMaxSec}s performance
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row laptop:flex-col gap-3 shrink-0 laptop:min-w-[200px]">
            {primaryCta}
            {arenaAuthenticated && entryStatus?.status === 'ACTIVE' && canWithdraw && (
              <button
                type="button"
                onClick={onWithdraw}
                disabled={entryActionLoading !== null}
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] border border-white/20 text-white hover:bg-white/[0.06] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {entryActionLoading === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}
              </button>
            )}
            <Link
              href="#arena-leaderboard"
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[14px] text-white/80 border border-white/[0.12] hover:bg-white/[0.06] transition-colors duration-200"
            >
              View rankings
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
