'use client';

import TalentScoreBadge from '@/components/talent/TalentScoreBadge';
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
  averageTalentScore?: number | null;
}

/**
 * Read-only creator stats — no fake toggles. Mobile-first single scan row.
 */
export default function ProfileStatsBar({
  performancesCount,
  followers,
  following,
  totalViews,
  totalLikes,
  votes,
  averageTalentScore,
}: ProfileStatsBarProps) {
  const cells = [
    { label: 'Performances', value: performancesCount },
    { label: 'Followers', value: followers },
    { label: 'Following', value: following },
  ];

  return (
    <div className="w-full min-w-0 px-4 pt-5">
      <div
        className={cn(
          'grid grid-cols-3 overflow-hidden rounded-2xl',
          'border border-white/[0.08] bg-white/[0.03]'
        )}
        role="region"
        aria-label="Profile statistics"
      >
        {cells.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center border-r border-white/[0.06] px-1 py-3.5 last:border-r-0"
          >
            <span className="font-display text-[17px] font-bold tabular-nums tracking-tight text-white">
              {formatNum(value)}
            </span>
            <span className="mt-0.5 text-center font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center font-sans text-[11px] leading-relaxed text-white/40">
        <span className="tabular-nums text-white/55">{formatNum(totalLikes)}</span>
        <span className="text-white/25"> likes</span>
        <span className="mx-2 text-white/15" aria-hidden>
          ·
        </span>
        <span className="tabular-nums text-white/55">{formatNum(totalViews)}</span>
        <span className="text-white/25"> views</span>
        {votes > 0 ? (
          <>
            <span className="mx-2 text-white/15" aria-hidden>
              ·
            </span>
            <span className="tabular-nums text-white/55">{formatNum(votes)}</span>
            <span className="text-white/25"> votes</span>
          </>
        ) : null}
      </p>

      <div className="mt-2 flex justify-center">
        <TalentScoreBadge score={averageTalentScore ?? null} votesCount={votes} variant="compact" />
      </div>
    </div>
  );
}
