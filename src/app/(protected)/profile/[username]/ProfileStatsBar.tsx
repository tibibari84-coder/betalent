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
  const stats = [
    { label: 'Following', value: formatNum(following) },
    { label: 'Followers', value: formatNum(followers) },
    { label: 'Likes', value: formatNum(totalLikes) },
  ];

  return (
    <div
      className="mobile-centered-card grid grid-cols-3 gap-2 md:gap-4 min-h-[72px] md:min-h-[80px] items-center rounded-[20px] px-3.5 md:px-6 py-4"
      style={{
        background: 'linear-gradient(135deg, rgba(18,22,31,0.88), rgba(9,11,18,0.96))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col justify-center items-center min-h-[52px] rounded-[12px] touch-manipulation text-center"
          role="group"
          aria-label={`${label}: ${value}`}
        >
          <span className="text-[18px] md:text-[20px] font-semibold text-white leading-tight tracking-tight">
            {value}
          </span>
          <span className="text-[11.5px] md:text-[12px] mt-0.5" style={{ color: '#9ba7b8' }}>
            {label}
          </span>
        </div>
      ))}
      <div className="col-span-3 flex items-center justify-center pt-3 mt-1 border-t border-[rgba(255,255,255,0.06)] text-center">
        <TalentScoreBadge
          score={averageTalentScore ?? null}
          variant="profile"
        />
      </div>
    </div>
  );
}
