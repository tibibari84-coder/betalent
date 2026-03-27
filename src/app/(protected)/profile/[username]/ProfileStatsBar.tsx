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
  /** Average talent score from creator's scored videos, or null */
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
  const primary = [
    { label: 'Following', value: formatNum(following) },
    { label: 'Followers', value: formatNum(followers) },
    { label: 'Likes', value: formatNum(totalLikes) },
  ];
  const secondary = [
    { label: 'Views', value: formatNum(totalViews) },
    { label: 'Votes', value: formatNum(votes) },
  ];

  return (
    <div
      className="mobile-centered-card grid grid-cols-3 gap-x-1 gap-y-2 md:gap-x-3 md:gap-y-3 rounded-[16px] px-3 md:px-5 py-3 md:py-4"
      style={{
        background: 'linear-gradient(135deg, rgba(18,22,31,0.88), rgba(9,11,18,0.96))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {primary.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col justify-center items-center min-h-[48px] rounded-[10px] touch-manipulation text-center px-0.5"
          role="group"
          aria-label={`${label}: ${value}`}
        >
          <span className="text-[17px] md:text-[19px] font-semibold text-white leading-none tracking-tight tabular-nums">
            {value}
          </span>
          <span className="text-[11px] md:text-[11.5px] mt-1" style={{ color: '#9ba7b8' }}>
            {label}
          </span>
        </div>
      ))}
      <div className="col-span-3 flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-10 pt-2 mt-1 border-t border-[rgba(255,255,255,0.06)]">
        {secondary.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col justify-center items-center min-h-[44px] touch-manipulation text-center px-2"
            role="group"
            aria-label={`${label}: ${value}`}
          >
            <span className="text-[15px] md:text-[17px] font-semibold text-white/95 leading-none tracking-tight tabular-nums">
              {value}
            </span>
            <span className="text-[10.5px] md:text-[11px] mt-1" style={{ color: '#9ba7b8' }}>
              {label}
            </span>
          </div>
        ))}
        <TalentScoreBadge score={averageTalentScore ?? null} variant="profile" />
      </div>
    </div>
  );
}
