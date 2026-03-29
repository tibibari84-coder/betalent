'use client';

import { cn } from '@/lib/utils';

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProfileStatsBarProps {
  performancesCount: number;
  followers: number;
  following: number;
  totalViews: number;
  totalLikes: number;
  votes: number;
}

/**
 * Creator stats — single scan row, no ranking widgets (leaderboard / talent explainer live elsewhere).
 */
export default function ProfileStatsBar({
  performancesCount,
  followers,
  following,
  totalViews,
  totalLikes,
  votes,
}: ProfileStatsBarProps) {
  const cells = [
    { label: 'Performances', value: performancesCount },
    { label: 'Followers', value: followers },
    { label: 'Following', value: following },
  ];

  return (
    <div className="w-full min-w-0 px-4 pb-1" role="region" aria-label="Profile statistics">
      <div className="flex justify-between gap-0 border-y border-white/[0.07] py-4">
        {cells.map(({ label, value }, i) => (
          <div
            key={label}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center px-1',
              i > 0 && 'border-l border-white/[0.06]'
            )}
          >
            <span className="font-display text-[18px] font-bold tabular-nums tracking-tight text-white">
              {formatNum(value)}
            </span>
            <span className="mt-1 text-center font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center font-sans text-[11px] leading-relaxed text-white/38">
        <span className="tabular-nums text-white/50">{formatNum(totalLikes)}</span>
        <span className="text-white/28"> likes</span>
        <span className="mx-2 text-white/12" aria-hidden>
          ·
        </span>
        <span className="tabular-nums text-white/50">{formatNum(totalViews)}</span>
        <span className="text-white/28"> views</span>
        {votes > 0 ? (
          <>
            <span className="mx-2 text-white/12" aria-hidden>
              ·
            </span>
            <span className="tabular-nums text-white/50">{formatNum(votes)}</span>
            <span className="text-white/28"> votes</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
