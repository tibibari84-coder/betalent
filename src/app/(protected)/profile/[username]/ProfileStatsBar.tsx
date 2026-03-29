'use client';

import TalentScoreBadge from '@/components/talent/TalentScoreBadge';

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProfileStatsBarProps {
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  votes: number;
  averageTalentScore?: number | null;
}

export default function ProfileStatsBar({
  followers,
  following,
  totalLikes,
  totalViews,
  votes,
  averageTalentScore,
}: ProfileStatsBarProps) {
  const items = [
    { label: 'Following', value: formatNum(following) },
    { label: 'Followers', value: formatNum(followers) },
    { label: 'Likes', value: formatNum(totalLikes) },
  ];

  return (
    <div className="w-full min-w-0">
      <div
        className="mx-4 mt-8 flex h-[72px] items-center justify-around rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
        role="region"
        aria-label="Profile statistics"
      >
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center"
            role="group"
            aria-label={`${label}: ${value}`}
          >
            <span className="text-[16px] font-bold tabular-nums text-white">{value}</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="mx-4 mt-3 text-center text-[11px] text-gray-500">
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
