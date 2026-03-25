'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function ProfileRankingBadge({
  username,
  countryCode,
  className = '',
}: ProfileRankingBadgeProps) {
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

  return (
    <Link
      href="/leaderboard"
      className={`inline-flex items-center gap-2 rounded-[12px] px-3 py-2 transition-colors hover:bg-white/[0.06] ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-bold text-white"
        style={{
          background: 'linear-gradient(135deg, rgba(196,18,47,0.35), rgba(196,18,47,0.15))',
          border: '1px solid rgba(196,18,47,0.3)',
        }}
      >
        🏆
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#9ba7b8' }}>
          Weekly rank
        </span>
        <span className="text-[14px] font-semibold text-white leading-tight">
          #{data.globalRank ?? data.countryRank}
          {data.globalRank != null && data.countryRank != null && (
            <span className="text-[11px] font-normal text-white/55 ml-1">
              · #{data.countryRank} in {data.countryCode ?? 'country'}
            </span>
          )}
          {data.globalRank != null && data.countryRank == null && (
            <span className="text-[11px] font-normal text-white/55 ml-1">global</span>
          )}
          {data.globalRank == null && data.countryRank != null && (
            <span className="text-[11px] font-normal text-white/55 ml-1">
              {data.countryCode ?? 'country'}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
