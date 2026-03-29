'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';
import { ChallengeHeroBackdrop } from '@/components/challenge/ChallengeHeroBackdrop';
import { cn } from '@/lib/utils';

type ChallengeWindowItem = {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type ChallengeItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  startAt: string;
  endAt: string;
  entryCloseAt?: string | null;
  votingCloseAt?: string | null;
  entriesCount: number;
  artistTheme?: string | null;
  maxDurationSec?: number;
  liveEventAt?: string | null;
  windows?: ChallengeWindowItem[];
};

function formatCountdown(endAt: string): string {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return 'Soon';
}

type PillVariant = 'live' | 'open' | 'upcoming' | 'neutral';

function pillVariant(status: string): PillVariant {
  if (status === 'LIVE_ACTIVE') return 'live';
  if (status === 'ENTRY_OPEN') return 'open';
  if (status === 'LIVE_UPCOMING' || status === 'SCHEDULED' || status === 'DRAFT') return 'upcoming';
  return 'neutral';
}

function statusLabel(status: string): string {
  if (status === 'ENTRY_OPEN') return 'Open';
  if (status === 'LIVE_ACTIVE') return 'Live';
  if (status === 'LIVE_UPCOMING') return 'Live soon';
  if (status === 'ENTRY_CLOSED') return 'Closed';
  if (status === 'VOTING_CLOSED') return 'Voting';
  if (status === 'SCHEDULED' || status === 'DRAFT') return 'Upcoming';
  if (status === 'WINNERS_LOCKED' || status === 'ARCHIVED') return 'Archive';
  return status.replaceAll('_', ' ');
}

function StatusPill({ status, className }: { status: string; className?: string }) {
  const v = pillVariant(status);
  const label = statusLabel(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
        v === 'live' &&
          'border-red-400/55 bg-red-950/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.35)] live-badge-pulse',
        v === 'open' &&
          'border-emerald-400/45 bg-emerald-950/40 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)]',
        v === 'upcoming' &&
          'border-sky-400/45 bg-sky-950/35 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.22)]',
        v === 'neutral' && 'border-white/15 bg-white/[0.06] text-white/75',
        className
      )}
    >
      {label}
    </span>
  );
}

const primaryBtn =
  'flex w-full max-w-[min(100%,320px)] min-h-[52px] items-center justify-center rounded-[18px] text-[15px] font-bold tracking-[0.02em] text-white transition-transform duration-150 active:scale-[0.96] sm:mx-auto';
const primaryBtnStyle = {
  background: 'linear-gradient(135deg,#c4122f 0%,#e11d48 55%,#be123c 100%)',
  boxShadow: '0 0 40px rgba(196,18,47,0.42), 0 12px 32px rgba(0,0,0,0.45)',
};

const ghostBtn =
  'flex w-full max-w-[min(100%,320px)] min-h-[44px] items-center justify-center rounded-[14px] border border-white/[0.12] bg-white/[0.04] text-[13px] font-semibold text-white/75 transition-all duration-150 active:scale-[0.96] hover:border-white/20 hover:bg-white/[0.07] hover:text-white sm:mx-auto';

const tileBase =
  'group relative block overflow-hidden rounded-[20px] border border-white/[0.08] transition-transform duration-200 active:scale-[0.98] md:hover:scale-[1.01] md:hover:border-accent/25';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/challenges?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.challenges)) {
          setChallenges(data.challenges);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const currentChallenge = challenges.find((c) =>
    ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE', 'VOTING_CLOSED'].includes(c.status)
  );
  const upcoming = challenges.filter((c) => c.status === 'DRAFT' || c.status === 'SCHEDULED');
  const past = challenges.filter((c) => c.status === 'WINNERS_LOCKED' || c.status === 'ARCHIVED');
  const totalEntries = challenges.reduce((sum, c) => sum + (c.entriesCount || 0), 0);

  const primaryHref = currentChallenge ? `/challenges/${currentChallenge.slug}` : '/upload';
  const primaryLabel = currentChallenge ? 'ENTER NOW' : 'START YOUR PERFORMANCE';

  const feedList = currentChallenge ? [...upcoming, ...past] : challenges;

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#070707] pb-24 md:pb-14">
      <ChallengeHeroBackdrop
        cinematic
        imageUrl={null}
        className="min-h-[min(90svh,820px)] md:min-h-[min(72svh,600px)]"
      >
        <div className="flex min-h-[min(90svh,820px)] flex-col justify-end px-[var(--layout-pad)] pb-10 pt-6 md:min-h-[min(72svh,600px)] md:px-8 md:pb-14">
          <div className="mx-auto flex w-full max-w-[var(--layout-content-max,1320px)] flex-col">
            <p className="challenges-reveal text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
              Weekly Live Cover
            </p>
            <h1 className="challenges-reveal challenges-reveal-delay-1 mt-2 font-display text-[clamp(1.85rem,6.5vw,3rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white">
              Step into the stage
            </h1>

            {currentChallenge ? (
              <div className="challenges-reveal challenges-reveal-delay-2 mt-5 flex flex-wrap items-center gap-2">
                <StatusPill status={currentChallenge.status} />
                {currentChallenge.artistTheme ? (
                  <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white/80">
                    {currentChallenge.artistTheme}
                  </span>
                ) : null}
                {currentChallenge.maxDurationSec ? (
                  <span className="text-[11px] font-medium tabular-nums text-white/45">
                    {currentChallenge.maxDurationSec}s max
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="challenges-reveal challenges-reveal-delay-2 mt-4 text-[13px] text-white/45">
                New themes drop weekly — be first in line.
              </p>
            )}

            <div className="challenges-reveal challenges-reveal-delay-3 mt-10 flex w-full flex-col gap-3 sm:items-center">
              <Link href={primaryHref} className={primaryBtn} style={primaryBtnStyle}>
                {primaryLabel}
              </Link>
              <Link href="/explore" className={ghostBtn}>
                Explore
              </Link>
            </div>
          </div>
        </div>
      </ChallengeHeroBackdrop>

      {/* Snapshot strip — thumb-scale metrics */}
      <div className="relative z-[1] -mt-3 px-[var(--layout-pad)] md:px-8">
        <div
          className="challenges-reveal challenges-reveal-delay-4 mx-auto grid max-w-[var(--layout-content-max,1320px)] grid-cols-3 gap-px overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.06]"
          style={{
            boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
          }}
        >
          <div className="bg-[#101012]/95 px-3 py-3.5 text-center md:px-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Entries</p>
            <p className="mt-1 font-display text-[22px] font-bold tabular-nums text-white md:text-[24px]">
              {loading ? '—' : totalEntries.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#101012]/95 px-2 py-3.5 text-center md:px-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">This week</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-white md:text-[14px]">
              {loading ? '…' : currentChallenge?.title ?? '—'}
            </p>
          </div>
          <div className="bg-[#101012]/95 px-3 py-3.5 text-center md:px-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Ends</p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-white/90 md:text-[14px]">
              {loading || !currentChallenge
                ? '—'
                : formatCountdown(currentChallenge.votingCloseAt ?? currentChallenge.endAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[var(--layout-content-max,1320px)] space-y-8 px-[var(--layout-pad)] pb-6 pt-10 md:px-8 md:pt-12">
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-36 animate-pulse rounded-[20px] bg-white/[0.06]" />
            <div className="h-28 animate-pulse rounded-[20px] bg-white/[0.05]" />
          </div>
        ) : (
          <>
            {currentChallenge && (
              <section aria-label="Featured challenge">
                <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Now playing</h2>
                <Link
                  href={`/challenges/${currentChallenge.slug}`}
                  className={cn(
                    tileBase,
                    'p-5 md:p-6'
                  )}
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 80% at 20% 0%, rgba(196,18,47,0.35), transparent 50%), linear-gradient(165deg, rgba(22,18,24,0.98) 0%, rgba(10,10,12,0.96) 100%)',
                    boxShadow: '0 24px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-90" />
                  <div className="relative flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={currentChallenge.status} />
                      <span className="text-[12px] tabular-nums text-white/50">
                        {formatCountdown(currentChallenge.votingCloseAt ?? currentChallenge.endAt)} left
                      </span>
                    </div>
                    <h3 className="font-display text-[1.35rem] font-bold leading-tight text-white md:text-[1.65rem]">
                      {currentChallenge.title}
                    </h3>
                    <p className="text-[13px] text-white/55">
                      {currentChallenge.entriesCount.toLocaleString()} entries
                      {currentChallenge.artistTheme ? ` · ${currentChallenge.artistTheme}` : ''}
                      {currentChallenge.maxDurationSec
                        ? ` · ${currentChallenge.maxDurationSec}s cap`
                        : ''}
                    </p>
                    {currentChallenge.windows && currentChallenge.windows.length > 0 ? (
                      <div className="pt-1">
                        <LiveWindowDisplay
                          windows={currentChallenge.windows}
                          showEventTimezone={false}
                          variant="compact"
                        />
                      </div>
                    ) : null}
                    <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
                      Open challenge
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </section>
            )}

            <section aria-label="More challenges">
              <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                {currentChallenge ? 'More weeks' : 'All challenges'}
              </h2>

              {feedList.length === 0 ? (
                <p className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-4 py-8 text-center text-[14px] text-white/45">
                  No other weeks yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {feedList.map((c) => (
                    <Link
                      key={c.id}
                      href={`/challenges/${c.slug}`}
                      className={cn(tileBase, 'p-4 md:p-5')}
                      style={{
                        background:
                          'linear-gradient(155deg, rgba(28,24,30,0.92) 0%, rgba(12,12,14,0.94) 100%)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{
                          background:
                            'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(196,18,47,0.15), transparent 55%)',
                        }}
                      />
                      <div className="relative">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <StatusPill status={c.status} />
                          <span className="text-[11px] tabular-nums text-white/40">
                            {c.entriesCount.toLocaleString()} in
                          </span>
                        </div>
                        <h3 className="font-display text-[16px] font-semibold leading-snug text-white md:text-[17px]">
                          {c.title}
                        </h3>
                        {c.artistTheme ? (
                          <p className="mt-1 truncate text-[12px] text-white/45">{c.artistTheme}</p>
                        ) : null}
                        <p className="mt-3 text-[11px] text-white/35">
                          {c.status === 'ENTRY_OPEN'
                            ? `Ends ${formatCountdown(c.entryCloseAt ?? c.endAt)}`
                            : c.status === 'VOTING_CLOSED'
                              ? 'Voting closed'
                              : statusLabel(c.status)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <p className="text-center text-[10px] text-white/25">
              Own your performance · Authentic entries only · Respect community guidelines
            </p>
          </>
        )}
      </div>
    </div>
  );
}
