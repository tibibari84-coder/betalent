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

interface ProfileSupportSectionProps {
  username: string;
}

const cardClass =
  'mx-4 mt-4 rounded-[20px] border border-white/5 bg-[#0A0A0A] p-4';
const iconClass = 'h-6 w-6 shrink-0 text-[#E31B23]';

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
      <div className={`${cardClass} animate-pulse`}>
        <div className="mb-4 h-4 w-36 rounded bg-white/5" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-white/5" />
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
    <section className={cardClass}>
      <div className="mb-4 flex items-center gap-3">
        <IconCoins className={iconClass} aria-hidden />
        <h2 className="text-[15px] font-semibold text-white">Community support</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-white/5 pb-4">
        {stats.map(({ label, value, sub, Icon }) => (
          <div key={label} className="flex min-w-0 flex-col items-center text-center">
            <Icon className="mb-1 h-5 w-5 text-[#E31B23] opacity-90" aria-hidden />
            <span className="text-[9px] font-medium uppercase tracking-widest text-gray-400">{label}</span>
            <span className="mt-1 text-[15px] font-semibold tabular-nums text-white">{value}</span>
            <span className="mt-0.5 text-[11px] text-gray-400">{sub}</span>
          </div>
        ))}
      </div>

      {hasSupporters ? (
        <div className="mt-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400">
            <IconUsers className="h-4 w-4 text-[#E31B23]" aria-hidden />
            Recent supporters
            <span className="font-normal tabular-nums text-gray-500">({supporters.length})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {supporters.slice(0, 6).map((s) => (
              <Link
                key={s.userId}
                href={`/profile/${encodeURIComponent(s.username)}`}
                className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-white/5 bg-black/40 py-2 pl-2 pr-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[13px] font-semibold text-gray-300">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
                  ) : (
                    (s.displayName || s.username).charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{s.displayName || s.username}</p>
                  <p className="text-[12px] tabular-nums text-gray-400">{formatCoins(s.totalCoinsSent)} coins</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
