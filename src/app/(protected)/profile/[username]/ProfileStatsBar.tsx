'use client';

import { useState } from 'react';
import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
import { cn } from '@/lib/utils';

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type StatKey = 'videos' | 'followers' | 'following';

interface ProfileStatsBarProps {
  videosCount: number;
  followers: number;
  following: number;
  totalViews: number;
  votes: number;
  averageTalentScore?: number | null;
}

export default function ProfileStatsBar({
  videosCount,
  followers,
  following,
  totalViews,
  votes,
  averageTalentScore,
}: ProfileStatsBarProps) {
  const [active, setActive] = useState<StatKey>('videos');

  const segments: { key: StatKey; label: string; value: number }[] = [
    { key: 'videos', label: 'Videos', value: videosCount },
    { key: 'followers', label: 'Followers', value: followers },
    { key: 'following', label: 'Following', value: following },
  ];

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          'mx-4 mt-8 flex h-[72px] items-stretch justify-around overflow-hidden rounded-2xl',
          'border border-white/10 bg-white/5 backdrop-blur-md',
          'shadow-[0_8px_22px_rgba(0,0,0,0.28)]'
        )}
        role="region"
        aria-label="Profile statistics"
      >
        {segments.map(({ key, label, value }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center',
                'transition-all duration-150 ease-out',
                'hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31B23]/40',
                isActive && 'rounded-xl shadow-[inset_0_0_12px_rgba(227,27,35,0.1)]'
              )}
              aria-pressed={isActive}
              aria-label={`${label}: ${formatNum(value)}`}
            >
              <span className="font-sans text-[16px] font-bold tabular-nums text-white">{formatNum(value)}</span>
              <span className="mt-0.5 font-sans text-[10px] font-medium uppercase tracking-widest text-gray-400">
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mx-4 mt-3 text-center font-sans text-[11px] text-gray-500">
        <span className="tabular-nums">{formatNum(totalViews)} views</span>
        <span className="mx-2 text-white/15" aria-hidden>
          ·
        </span>
        <span className="tabular-nums">{formatNum(votes)} votes</span>
      </p>
      <div className="mx-4 mt-3 flex justify-center">
        <TalentScoreBadge score={averageTalentScore ?? null} votesCount={votes} variant="profile" />
      </div>
    </div>
  );
}
