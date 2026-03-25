'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IconUpload, IconPlay } from '@/components/ui/Icons';
import Top3Leaderboard, { type Top3Entry } from '@/components/leaderboard/Top3Leaderboard';
import LeaderboardTable, { type LeaderboardRowEntry } from '@/components/leaderboard/LeaderboardTable';
import { getAllCountries, getCountryName, getFlagEmoji } from '@/lib/countries';

type Scope = 'global' | 'country';
type Target = 'creator' | 'performance';
type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

type CreatorEntry = {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string;
  isVerified: boolean;
  score: number;
};

type PerformanceEntry = {
  rank: number;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  creatorCountry: string | null;
  creatorCountryFlag: string;
  categoryName: string;
  score: number;
  talentScore: number | null;
  viewsCount: number;
  likesCount: number;
  votesCount: number;
};

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  all_time: 'All Time',
};

function isCreatorEntry(
  target: Target,
  item: CreatorEntry | PerformanceEntry,
): item is CreatorEntry {
  return target === 'creator';
}

/** Premium pill button for filters */
function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-[10px] px-3.5 text-[12px] font-medium transition-all ${
        active ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
      }`}
      style={
        active
          ? {
              background: 'linear-gradient(180deg, rgba(177,18,38,0.95) 0%, rgba(139,14,31,0.95) 100%)',
              boxShadow: '0 4px 12px rgba(177,18,38,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/** Premium empty state: ranking explanation + competition guidance (no fake data) */
function LeaderboardFallbackContent({ target, promptSelectCountry }: { target: Target; promptSelectCountry?: boolean }) {
  return (
    <section className="mx-auto max-w-[560px] space-y-6">
      {promptSelectCountry ? (
        <p className="text-[14px] text-white/70 text-center">
          Select a country above to explore regional rankings.
        </p>
      ) : (
        <p className="text-[15px] font-medium text-white/80 text-center">
          No rankings yet. Be the first to compete!
        </p>
      )}
      {/* Ranking explanation */}
      <div
        className="rounded-[20px] p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(22,22,26,0.95) 0%, rgba(14,14,18,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
        }}
      >
        <h2 className="mb-3 font-display text-[18px] font-semibold text-white">How ranking works</h2>
        <p className="text-[14px] text-white/70 leading-relaxed mb-4">
          Rankings are based on real engagement metrics from performances. Every period uses the same score model; only the time window changes. Top creators and performances rise through genuine traction.
        </p>
        <p className="text-[13px] text-white/55 leading-relaxed">
          Filter by period (daily, weekly, monthly, all time) or country to discover talent. The leaderboard updates as creators compete and audiences engage.
        </p>
      </div>
      {/* Competition guidance */}
      <div
        className="rounded-[20px] p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(28,22,26,0.9) 0%, rgba(18,14,18,0.95) 100%)',
          border: '1px solid rgba(177,18,38,0.15)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)',
        }}
      >
        <h2 className="mb-3 font-display text-[18px] font-semibold text-white">
          {target === 'creator' ? 'Get on the creator leaderboard' : 'Get your performance ranked'}
        </h2>
        <p className="text-[14px] text-white/70 leading-relaxed mb-5">
          {target === 'creator'
            ? 'Upload performances, enter challenges, and build your audience. Creator rank reflects your overall impact across videos, votes, and engagement.'
            : 'Upload a performance and enter challenges. Share with your audience—votes and engagement determine your ranking.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-95"
            style={{
              background: 'linear-gradient(180deg, rgba(177,18,38,0.95) 0%, rgba(139,14,31,0.95) 100%)',
              boxShadow: '0 6px 20px rgba(177,18,38,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <IconUpload className="h-4 w-4" />
            Upload Performance
          </Link>
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium text-white/90 border border-white/20 hover:bg-white/[0.06] transition-colors"
          >
            <IconPlay className="h-4 w-4" />
            Browse Challenges
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('global');
  const [target, setTarget] = useState<Target>('creator');
  const [period, setPeriod] = useState<Period>('weekly');
  const [countryCode, setCountryCode] = useState<string>('');
  const [creatorEntries, setCreatorEntries] = useState<CreatorEntry[]>([]);
  const [performanceEntries, setPerformanceEntries] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const countries = getAllCountries();

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('scope', scope);
      params.set('target', target);
      params.set('period', period);
      params.set('limit', '100');
      if (scope === 'country' && countryCode) params.set('countryCode', countryCode);

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message ?? 'Failed to load leaderboard');

      if (data.target === 'creator') {
        setCreatorEntries(data.entries ?? []);
        setPerformanceEntries([]);
      } else {
        setPerformanceEntries(data.entries ?? []);
        setCreatorEntries([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setCreatorEntries([]);
      setPerformanceEntries([]);
    } finally {
      setLoading(false);
    }
  }, [scope, target, period, countryCode]);

  useEffect(() => {
    if (scope === 'country' && !countryCode) {
      setCreatorEntries([]);
      setPerformanceEntries([]);
      setLoading(false);
      return;
    }
    fetchLeaderboard();
  }, [scope, target, period, countryCode, fetchLeaderboard]);

  const entries = target === 'creator' ? creatorEntries : performanceEntries;
  const topSpotlight = entries.slice(0, 3);
  const rest = entries.slice(3);
  const hasData = entries.length > 0;

  /** Top 3 podium layout: #1 centered and dominant, #2 left, #3 right — only when real data exists */
  const top3Entries: Top3Entry[] = topSpotlight.map((e) => {
    if (isCreatorEntry(target, e)) {
      return {
        rank: e.rank,
        avatarUrl: e.avatarUrl,
        displayName: e.displayName,
        username: e.username,
        score: e.score,
        country: e.country,
        countryFlag: e.countryFlag || (e.country ? getFlagEmoji(e.country) : undefined),
        href: `/profile/${e.username}`,
      };
    }
    const p = e as PerformanceEntry;
    return {
      rank: p.rank,
      avatarUrl: p.creatorAvatarUrl,
      displayName: p.creatorDisplayName,
      username: p.creatorUsername,
      score: p.score,
      country: p.creatorCountry,
      countryFlag: p.creatorCountryFlag || (p.creatorCountry ? getFlagEmoji(p.creatorCountry) : undefined),
      videoId: p.videoId,
    };
  });

  /** Full ranking rows: real entries only. No fake trend — trend indicators removed until real data exists. */
  const tableEntries: LeaderboardRowEntry[] = rest.map((e) => {
    if (isCreatorEntry(target, e)) {
      return {
        rank: e.rank,
        avatarUrl: e.avatarUrl,
        displayName: e.displayName,
        username: e.username,
        score: e.score,
        href: `/profile/${e.username}`,
      };
    }
    const p = e as PerformanceEntry;
    return {
      rank: p.rank,
      avatarUrl: p.creatorAvatarUrl,
      displayName: p.creatorDisplayName,
      username: p.creatorUsername,
      score: p.score,
      videoId: p.videoId,
    };
  });

  const renderSpotlight = () => (top3Entries.length > 0 ? <Top3Leaderboard entries={top3Entries} /> : null);

  return (
    <div
      className="relative min-h-[calc(100vh-60px)] w-full overflow-x-hidden pb-24 md:min-h-[calc(100vh-72px)] md:pb-12"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(177,18,38,0.12), transparent 50%), linear-gradient(180deg, #0D0D0E 0%, #0a0a0c 100%)',
      }}
    >
      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8">
        {/* Header + filters */}
        <header
          className="mb-5 rounded-[20px] p-5 md:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(22,22,26,0.95) 0%, rgba(14,14,18,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02)',
          }}
        >
          <h1 className="mb-1 font-display text-[22px] font-bold text-white sm:text-[26px] md:text-[28px]">
            {scope === 'country' && countryCode
              ? target === 'creator'
                ? `Top Voices in ${getCountryName(countryCode)} ${getFlagEmoji(countryCode)}`
                : `Top Performances in ${getCountryName(countryCode)} ${getFlagEmoji(countryCode)}`
              : 'Global Leaderboard'}
          </h1>
          <p className="mb-4 max-w-[640px] text-[13px] leading-relaxed text-white/60 sm:text-[14px]">
            {scope === 'country' && countryCode
              ? `Discover the strongest voices and top performances from ${getCountryName(countryCode)}.`
              : 'Track the most powerful voices and top-ranked talent on the BETALENT stage.'}
          </p>
          <p className="mb-4 text-[12px] leading-relaxed text-white/45">
            Ranking meaning is consistent across all periods. Period filters only change the measured time window.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-[10px] p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FilterPill active={scope === 'global'} onClick={() => setScope('global')}>Global</FilterPill>
              <FilterPill active={scope === 'country'} onClick={() => setScope('country')}>Country</FilterPill>
            </div>
            <div className="flex gap-1 rounded-[10px] p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FilterPill active={target === 'creator'} onClick={() => setTarget('creator')}>Creators</FilterPill>
              <FilterPill active={target === 'performance'} onClick={() => setTarget('performance')}>Performances</FilterPill>
            </div>
            {scope === 'country' && (
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-9 min-w-[160px] rounded-[10px] border pl-3 pr-8 text-[12px] font-medium text-white outline-none focus:ring-2 focus:ring-accent/30"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                aria-label="Select country"
              >
                <option value="" style={{ color: '#111' }}>Select country</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code} style={{ color: '#111' }}>{c.flagEmoji} {c.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-1 rounded-[10px] p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['daily', 'weekly', 'monthly', 'all_time'] as const).map((p) => (
                <FilterPill key={p} active={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABELS[p]}</FilterPill>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-[16px] p-4 text-[13px] text-red-300" style={{ background: 'rgba(85,24,32,0.4)', border: '1px solid rgba(255,110,130,0.2)' }}>
            {error}
          </div>
        )}

        {scope === 'country' && !countryCode && (
          <LeaderboardFallbackContent target={target} promptSelectCountry />
        )}

        {loading && !(scope === 'country' && !countryCode) && (
          <div className="flex items-center justify-center py-16">
            <p className="text-[14px] text-white/55">Loading rankings…</p>
          </div>
        )}

        {!loading && !error && !(scope === 'country' && !countryCode) && (
          <>
            {hasData ? (
              <>
                {/* Top spotlight – podium layout */}
                <section className="mb-5">
                  <h2 className="mb-3 font-display text-[16px] font-semibold text-white sm:text-[18px]">
                    Top 3
                  </h2>
                  {renderSpotlight()}
                </section>

                {rest.length > 0 && (
                  <section
                    className="overflow-hidden rounded-[18px]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20,20,24,0.95) 0%, rgba(12,12,16,0.98) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 md:px-6">
                      <h2 className="font-display text-[15px] font-semibold text-white sm:text-[16px]">Full Ranking</h2>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Ranks 4+ · Updates {period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : period === 'monthly' ? 'monthly' : 'over time'}
                      </p>
                    </div>

                    <LeaderboardTable entries={tableEntries} />
                  </section>
                )}
              </>
            ) : (
              <LeaderboardFallbackContent target={target} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
