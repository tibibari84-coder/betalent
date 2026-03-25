'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconCoins, IconGift, IconUsers } from '@/components/ui/Icons';

type CreatorMonetizationSummary = {
  totalGiftsReceived: number;
  totalCoinSupportReceived: number;
  totalSuperVoteCoinsReceived?: number;
  totalSupportCoins?: number;
  totalEarningsCredited: number;
  weeklySupportAmount: number;
  allTimeSupportAmount: number;
  year: number;
  week: number;
};

type CreatorTopSupporter = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  totalCoinsSent: number;
  giftsCount: number;
};

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProfileSupportSectionProps {
  username: string;
}

export default function ProfileSupportSection({ username }: ProfileSupportSectionProps) {
  const [monetization, setMonetization] = useState<CreatorMonetizationSummary | null>(null);
  const [supporters, setSupporters] = useState<CreatorTopSupporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/profile/${encodeURIComponent(username)}/monetization`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/profile/${encodeURIComponent(username)}/supporters?limit=6`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([monRes, supRes]) => {
        if (cancelled) return;
        if (monRes?.ok && monRes.monetization) setMonetization(monRes.monetization);
        else setMonetization(null);
        if (supRes?.ok && Array.isArray(supRes.supporters)) setSupporters(supRes.supporters);
        else setSupporters([]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div
        className="rounded-[20px] border p-5 sm:p-6 md:p-7 animate-pulse"
        style={{
          background: 'rgba(18,22,31,0.5)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="h-5 w-40 rounded bg-white/5 mb-6" />
        <div className="grid grid-cols-3 gap-4 sm:gap-6 py-5 px-4 rounded-xl mb-7" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded bg-white/5" />
          ))}
        </div>
        <div className="h-4 w-28 rounded bg-white/5 mb-3" />
        <div className="flex flex-wrap gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-24 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const totalSupportCoins = monetization?.totalSupportCoins ?? (monetization?.totalCoinSupportReceived ?? 0) + (monetization?.totalSuperVoteCoinsReceived ?? 0);
  const hasAnySupport =
    monetization &&
    (totalSupportCoins > 0 ||
      monetization.totalGiftsReceived > 0 ||
      monetization.totalEarningsCredited > 0);
  const hasSupporters = supporters.length > 0;

  if (error || (!hasAnySupport && !hasSupporters)) {
    return null;
  }

  const stats = [
    {
      label: 'Gift support',
      value: formatCoins(monetization?.totalCoinSupportReceived ?? 0),
      sub: 'coins received',
      Icon: IconGift,
    },
    {
      label: 'Super vote',
      value: formatCoins(monetization?.totalSuperVoteCoinsReceived ?? 0),
      sub: 'coins received',
      Icon: IconCoins,
    },
    {
      label: 'Total support',
      value: formatCoins(totalSupportCoins),
      sub: 'coins',
      Icon: IconCoins,
    },
  ];

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'rgba(18,22,31,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div className="p-5 sm:p-6 md:p-7">
        {/* Header – section title */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-[10px]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <IconCoins className="w-4 h-4 opacity-80" style={{ color: '#e8eaed' }} />
          </span>
          <h2
            className="font-display text-[14px] font-semibold tracking-tight"
            style={{ color: '#e8eaed' }}
          >
            Community support
          </h2>
        </div>

        {/* Stats strip – primary hierarchy, consistent spacing */}
        <div
          className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 py-5 px-4 rounded-xl mb-7"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {stats.map(({ label, value, sub, Icon }) => (
            <div key={label} className="flex flex-col items-center text-center md:items-start md:text-left min-w-0">
              <span
                className="text-[10px] uppercase tracking-widest mb-1.5 font-medium flex items-center gap-1.5"
                style={{ color: '#8b95a5', letterSpacing: '0.12em' }}
              >
                <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" />
                {label}
              </span>
              <span className="text-[21px] sm:text-[23px] md:text-[24px] font-semibold text-white leading-none tabular-nums tracking-tight">
                {value}
              </span>
              <span className="text-[11px] mt-1.5" style={{ color: '#6b7280' }}>
                {sub}
              </span>
            </div>
          ))}
        </div>

        {/* Top supporters – readable counter and coin amounts */}
        {hasSupporters && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3 font-medium flex items-center gap-2" style={{ color: '#8b95a5', letterSpacing: '0.12em' }}>
              <IconUsers className="w-3.5 h-3.5 opacity-80" />
              Recent support activity
              <span className="font-normal opacity-80 tabular-nums">({supporters.length})</span>
            </p>
            <div className="flex flex-wrap items-stretch gap-2.5 sm:gap-3">
              {supporters.slice(0, 6).map((s) => (
                <Link
                  key={s.userId}
                  href={`/profile/${encodeURIComponent(s.username)}`}
                  className="flex items-center gap-2.5 rounded-xl py-2.5 px-3 min-w-0 overflow-hidden transition-colors duration-200 hover:bg-white/[0.06] active:scale-[0.99] max-w-full"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[13px] font-semibold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#B7BDC7' }}
                  >
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" className="avatar-image h-full w-full" />
                    ) : (
                      (s.displayName || s.username).charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-[13px] font-medium text-white truncate">
                      {s.displayName || s.username}
                    </p>
                    <p className="text-[12px] tabular-nums mt-0.5" style={{ color: '#9ba7b8' }}>
                      {formatCoins(s.totalCoinsSent)} coins
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
