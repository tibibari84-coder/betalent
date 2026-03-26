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

  return (
    <div className="min-h-screen pb-24 md:pb-12 min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      <ChallengeHeroBackdrop
        imageUrl={null}
        className="px-4 md:px-6 laptop:px-8 pt-6 md:pt-8 laptop:pt-12 pb-8 min-h-[200px] md:min-h-[240px] rounded-b-2xl md:rounded-b-3xl"
      >
        <div className="w-full max-w-[1200px] mx-auto min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-white/50 font-medium mb-1.5">
            Weekly Live Cover Challenge
          </p>
          <h1 className="font-display text-[28px] md:text-[36px] laptop:text-[42px] font-bold text-white mb-2">
            Artist Themes
          </h1>
          <p className="text-[15px] text-white/70 max-w-[560px] mb-0">
            Each week features one world-famous artist. Perform covers in your chosen style. Max length is set per challenge (see challenge page; platform allows up to 150s where configured).
          </p>
        </div>
      </ChallengeHeroBackdrop>

      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 laptop:px-8 pt-4 laptop:pt-6 pb-8">
        {loading ? (
          <p className="text-white/55 text-[15px]">Loading challenges…</p>
        ) : (
          <>
            {currentChallenge && (
              <section className="mb-10">
                <h2 className="font-display text-[18px] font-semibold text-white mb-4">This Week</h2>
                <Link
                  href={`/challenges/${currentChallenge.slug}`}
                  className="block rounded-[20px] border p-6 transition-all hover:border-accent/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(28,22,26,0.95) 0%, rgba(20,18,22,0.92) 100%)',
                    borderColor: 'rgba(177,18,38,0.3)',
                  }}
                >
                  <p className="text-accent text-[12px] font-semibold uppercase tracking-wider mb-1">
                    {currentChallenge.status === 'ENTRY_OPEN' ? 'Open for entries' : currentChallenge.status === 'VOTING_CLOSED' ? 'Voting closed' : 'Live / Voting'}
                  </p>
                  <h3 className="font-display text-[22px] font-bold text-white mb-1">{currentChallenge.title}</h3>
                  {currentChallenge.artistTheme && (
                    <p className="text-[14px] text-white/70 mb-2">Perform covers from {currentChallenge.artistTheme}</p>
                  )}
                  <p className="text-[13px] text-white/50">
                    {currentChallenge.entriesCount.toLocaleString()} entries · Ends in {formatCountdown(currentChallenge.votingCloseAt ?? currentChallenge.endAt)}
                  </p>
                  {currentChallenge.windows && currentChallenge.windows.length > 0 && (
                    <div className="mt-3">
                      <LiveWindowDisplay windows={currentChallenge.windows} showEventTimezone={false} variant="compact" />
                    </div>
                  )}
                </Link>
              </section>
            )}

            <section>
              <h2 className="font-display text-[18px] font-semibold text-white mb-4">
                {currentChallenge ? 'Upcoming & Past' : 'All Weeks'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {(currentChallenge ? [...upcoming, ...past] : challenges).map((c) => (
                  <Link
                    key={c.id}
                    href={`/challenges/${c.slug}`}
                    className="block rounded-[16px] border p-4 transition-all hover:border-accent/20"
                    style={{
                      background: 'rgba(26,26,28,0.72)',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
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
