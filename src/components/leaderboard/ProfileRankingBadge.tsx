'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconTrophy } from '@/components/ui/Icons';

type RankingData = {
  globalRank: number | null;
  countryRank: number | null;
  countryCode: string | null;
  period: string;
};

interface ProfileRankingBadgeProps {
  username: string;
  countryCode?: string | null;
  className?: string;
}

export default function ProfileRankingBadge({ username, className = '' }: ProfileRankingBadgeProps) {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/profile/${encodeURIComponent(username)}/ranking?period=weekly`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) {
          setData({
            globalRank: res.globalRank ?? null,
            countryRank: res.countryRank ?? null,
            countryCode: res.countryCode ?? null,
            period: res.period ?? 'weekly',
          });
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading || !data) return null;
  const hasRank = data.globalRank != null || data.countryRank != null;
  if (!hasRank) return null;

  const rankLine =
    data.globalRank != null && data.countryRank != null
      ? `#${data.globalRank} global · #${data.countryRank} ${data.countryCode ?? 'country'}`
      : data.globalRank != null
        ? `#${data.globalRank} global`
        : `#${data.countryRank} ${data.countryCode ?? 'country'}`;

  return (
    <Link
      href="/leaderboard"
      className={`mx-4 mt-4 flex w-[calc(100%-2rem)] touch-manipulation items-center gap-3 rounded-[20px] border border-white/5 bg-[#0A0A0A] p-4 transition-colors hover:bg-white/[0.04] ${className}`}
    >
      <IconTrophy className="h-6 w-6 shrink-0 text-[#E31B23]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-white">{rankLine}</p>
        <p className="mt-0.5 text-[13px] text-gray-400">Weekly ranking · tap for leaderboard</p>
      </div>
    </Link>
  );
}
