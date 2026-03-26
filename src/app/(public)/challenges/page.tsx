'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';
import { ChallengeHeroBackdrop } from '@/components/challenge/ChallengeHeroBackdrop';

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
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h`;
  return 'Ending soon';
}

function statusBadge(status: string): { label: string; tone: string } {
  if (status === 'ENTRY_OPEN') return { label: 'Open for entries', tone: 'text-emerald-200 bg-emerald-500/20 border-emerald-400/35' };
  if (status === 'LIVE_ACTIVE') return { label: 'Live now', tone: 'text-rose-100 bg-rose-500/20 border-rose-400/35' };
  if (status === 'LIVE_UPCOMING') return { label: 'Live upcoming', tone: 'text-sky-100 bg-sky-500/20 border-sky-400/35' };
  if (status === 'ENTRY_CLOSED') return { label: 'Entry closed', tone: 'text-amber-100 bg-amber-500/20 border-amber-400/35' };
  if (status === 'VOTING_CLOSED') return { label: 'Voting closed', tone: 'text-white/90 bg-white/10 border-white/20' };
  if (status === 'SCHEDULED' || status === 'DRAFT') return { label: 'Upcoming', tone: 'text-white/80 bg-white/10 border-white/20' };
  return { label: status.replaceAll('_', ' '), tone: 'text-white/75 bg-white/10 border-white/20' };
}

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
  const heroStatus = currentChallenge ? statusBadge(currentChallenge.status) : null;

  return (
    <div className="min-h-screen pb-24 md:pb-12 min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      <ChallengeHeroBackdrop
        imageUrl={null}
        className="pt-7 md:pt-9 laptop:pt-12 pb-10 md:pb-12 min-h-[280px] md:min-h-[360px] rounded-b-2xl md:rounded-b-3xl border-b border-white/[0.08]"
      >
        <div className="mobile-page-column w-full max-w-[var(--layout-content-max,1320px)] min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 lg:gap-6 items-end">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/65 font-semibold mb-2">
                Weekly Live Cover Challenge
              </p>
              <h1 className="font-display text-[30px] md:text-[42px] laptop:text-[52px] leading-[1.03] font-bold text-white mb-3">
                Compete. Perform. Rise.
              </h1>
              <p className="text-[15px] md:text-[16px] text-white/80 max-w-[760px] mb-4 leading-[1.6]">
                High-energy weekly artist themes, live windows, and creator-vs-creator momentum.
                Enter now, publish your best short-form performance, and climb the challenge stage.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {heroStatus ? (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${heroStatus.tone}`}>
                    {heroStatus.label}
                  </span>
                ) : null}
                {currentChallenge?.artistTheme ? (
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[12px] font-medium text-white/85">
                    Theme: {currentChallenge.artistTheme}
                  </span>
                ) : null}
                {currentChallenge?.maxDurationSec ? (
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[12px] font-medium text-white/85">
                    Max duration: {currentChallenge.maxDurationSec}s
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={currentChallenge ? `/challenges/${currentChallenge.slug}` : '/upload'}
                  className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-[12px] text-[13px] font-semibold text-white border border-white/10"
                  style={{ background: 'linear-gradient(135deg,#c4122f,#e11d48)', boxShadow: '0 14px 30px rgba(196,18,47,0.35)' }}
                >
                  {currentChallenge ? 'View weekly challenge' : 'Start competing'}
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-[12px] text-[13px] font-semibold text-white/90 border border-white/[0.2] bg-black/20 hover:bg-white/[0.08] transition-colors"
                >
                  Upload entry
                </Link>
              </div>
            </div>

            <div
              className="rounded-[18px] border p-4 md:p-5"
              style={{
                background: 'linear-gradient(160deg, rgba(17,18,24,0.82) 0%, rgba(12,12,14,0.92) 100%)',
                borderColor: 'rgba(255,255,255,0.14)',
                boxShadow: '0 16px 34px rgba(0,0,0,0.42)',
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/55 mb-3">Challenge pulse</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[12px] border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[11px] text-white/60">Active week</p>
                  <p className="text-[14px] font-semibold text-white truncate">{currentChallenge?.title ?? 'No active week yet'}</p>
                </div>
                <div className="rounded-[12px] border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[11px] text-white/60">Total entries</p>
                  <p className="text-[18px] font-bold text-white">{totalEntries.toLocaleString()}</p>
                </div>
                <div className="rounded-[12px] border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[11px] text-white/60">Upcoming weeks</p>
                  <p className="text-[18px] font-bold text-white">{upcoming.length}</p>
                </div>
                <div className="rounded-[12px] border border-white/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[11px] text-white/60">Past weeks</p>
                  <p className="text-[18px] font-bold text-white">{past.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ChallengeHeroBackdrop>

      <div className="mobile-page-column w-full max-w-[var(--layout-content-max,1320px)] pt-5 laptop:pt-7 pb-8 space-y-7 md:space-y-8">
        {loading ? (
          <p className="text-white/55 text-[15px]">Loading challenges…</p>
        ) : (
          <>
            <section
              className="rounded-[18px] border p-4 md:p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(17,18,24,0.62) 0%, rgba(12,12,14,0.86) 100%)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <h2 className="font-display text-[20px] font-semibold text-white mb-3">Rules & Guidelines</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[14px] text-white/75">
                <p>• Submit your own performance. Originality and authenticity are required.</p>
                <p>• Follow weekly artist/theme constraints shown in the challenge details.</p>
                <p>• Keep video duration within the challenge cap for fair ranking eligibility.</p>
                <p>• Respect platform conduct rules. Violations can lead to removal or suspension.</p>
              </div>
            </section>

            {currentChallenge && (
              <section>
                <div className="flex items-end justify-between gap-3 mb-4">
                  <h2 className="font-display text-[20px] font-semibold text-white">Weekly Headliner</h2>
                  <Link href="/upload" className="text-[13px] font-medium text-accent hover:text-accent-hover">
                    Ready to compete →
                  </Link>
                </div>
                <Link
                  href={`/challenges/${currentChallenge.slug}`}
                  className="block rounded-[20px] border p-6 transition-all hover:border-accent/35"
                  style={{
                    background:
                      'radial-gradient(circle at 10% 10%, rgba(196,18,47,0.22), transparent 48%), linear-gradient(135deg, rgba(28,22,26,0.95) 0%, rgba(20,18,22,0.92) 100%)',
                    borderColor: 'rgba(177,18,38,0.34)',
                    boxShadow: '0 18px 38px rgba(0,0,0,0.36)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${statusBadge(currentChallenge.status).tone}`}>
                      {statusBadge(currentChallenge.status).label}
                    </span>
                    <span className="text-[12px] text-white/65">
                      Ends in {formatCountdown(currentChallenge.votingCloseAt ?? currentChallenge.endAt)}
                    </span>
                  </div>
                  <h3 className="font-display text-[24px] md:text-[28px] font-bold text-white mb-1">{currentChallenge.title}</h3>
                  <p className="text-[14px] text-white/70 mb-2">
                    {currentChallenge.artistTheme
                      ? `Theme week: ${currentChallenge.artistTheme}`
                      : 'Weekly live challenge event'}
                  </p>
                  <p className="text-[13px] text-white/55">
                    {currentChallenge.entriesCount.toLocaleString()} entries · Max duration{' '}
                    {(currentChallenge.maxDurationSec ?? 150).toLocaleString()}s
                  </p>
                  {currentChallenge.windows && currentChallenge.windows.length > 0 && (
                    <div className="mt-3">
                      <LiveWindowDisplay windows={currentChallenge.windows} showEventTimezone={false} variant="compact" />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[11px] text-[13px] font-semibold text-white border border-white/10 bg-white/[0.07]">
                      Watch entries
                    </span>
                    <span className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[11px] text-[13px] font-semibold text-white border border-white/10 bg-gradient-to-r from-[#c4122f] to-[#e11d48]">
                      Join this week
                    </span>
                  </div>
                </Link>
              </section>
            )}

            <section>
              <h2 className="font-display text-[18px] font-semibold text-white mb-4">
                {currentChallenge ? 'Upcoming & Past Weeks' : 'All Weeks'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {(currentChallenge ? [...upcoming, ...past] : challenges).map((c) => (
                  <Link
                    key={c.id}
                    href={`/challenges/${c.slug}`}
                    className="block rounded-[16px] border p-4 transition-all hover:border-accent/20"
                    style={{
                      background:
                        'radial-gradient(circle at 5% 0%, rgba(196,18,47,0.10), transparent 42%), rgba(26,26,28,0.72)',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-[11px] text-white/55 mb-1 uppercase tracking-[0.08em]">
                      {statusBadge(c.status).label}
                    </p>
                    <h3 className="font-display text-[16px] font-semibold text-white truncate">{c.title}</h3>
                    {c.artistTheme && (
                      <p className="text-[12px] text-white/60 mt-0.5 truncate">{c.artistTheme}</p>
                    )}
                    <p className="text-[11px] text-white/45 mt-2">
                      {c.entriesCount.toLocaleString()} entries
                      {c.status === 'ENTRY_OPEN' ? ` · ${formatCountdown(c.entryCloseAt ?? c.endAt)}` : c.status === 'VOTING_CLOSED' ? ' · Voting closed' : ` · ${c.status}`}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
