'use client';

import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';
import OpenPerformanceModalTrigger from '@/components/performance/OpenPerformanceModalTrigger';

export type Top3Entry = {
  rank: number;
  avatarUrl?: string | null;
  displayName: string;
  username: string;
  score: number;
  country: string | null;
  countryFlag?: string;
  /** Optional: link to profile. If not provided, renders as div. */
  href?: string;
  /** Optional: for performance entries, open video modal on click */
  videoId?: string;
};

const MEDALS = ['🥇', '🥈', '🥉'] as const;

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

const CARD_BASE = 'rounded-[20px] p-4 md:p-5 flex flex-col items-center text-center transition-all duration-300';

const RANK_STYLES = {
  1: {
    card: `${CARD_BASE} w-full max-w-[200px] md:max-w-[240px]`,
    glow: '0 0 48px rgba(212,175,55,0.25), 0 0 24px rgba(196,18,47,0.15), 0 20px 48px rgba(0,0,0,0.4)',
    border: '1px solid rgba(212,175,55,0.35)',
    bg: 'linear-gradient(165deg, rgba(40,32,28,0.98) 0%, rgba(28,20,22,0.96) 50%, rgba(22,16,18,0.98) 100%)',
    avatarSize: 'h-20 w-20 md:h-24 md:w-24',
    avatarRing: 'ring-2 ring-amber-400/40 ring-offset-2 ring-offset-[#0D0D0E]',
    nameSize: 'text-[15px] md:text-[17px]',
    scoreSize: 'text-[22px] md:text-[26px]',
    medalSize: 'text-[28px] md:text-[32px]',
  },
  2: {
    card: `${CARD_BASE} w-full max-w-[160px] md:max-w-[200px]`,
    glow: '0 12px 36px rgba(0,0,0,0.35), 0 0 16px rgba(192,192,192,0.08), 0 0 0 1px rgba(255,255,255,0.04)',
    border: '1px solid rgba(192,192,192,0.25)',
    bg: 'linear-gradient(135deg, rgba(28,26,28,0.95) 0%, rgba(20,20,24,0.92) 100%)',
    avatarSize: 'h-14 w-14 md:h-16 md:w-16',
    avatarRing: 'ring-2 ring-slate-400/30 ring-offset-2 ring-offset-[#0D0D0E]',
    nameSize: 'text-[13px] md:text-[15px]',
    scoreSize: 'text-[18px] md:text-[20px]',
    medalSize: 'text-[22px] md:text-[24px]',
  },
  3: {
    card: `${CARD_BASE} w-full max-w-[160px] md:max-w-[200px]`,
    glow: '0 8px 28px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
    border: '1px solid rgba(205,127,50,0.2)',
    bg: 'linear-gradient(135deg, rgba(26,24,26,0.92) 0%, rgba(18,18,22,0.9) 100%)',
    avatarSize: 'h-14 w-14 md:h-16 md:w-16',
    avatarRing: 'ring-2 ring-amber-700/25 ring-offset-2 ring-offset-[#0D0D0E]',
    nameSize: 'text-[13px] md:text-[15px]',
    scoreSize: 'text-[18px] md:text-[20px]',
    medalSize: 'text-[22px] md:text-[24px]',
  },
} as const;

function Top3Card({ entry }: { entry: Top3Entry }) {
  const rank = Math.min(3, Math.max(1, entry.rank)) as 1 | 2 | 3;
  const style = RANK_STYLES[rank];
  const medal = MEDALS[rank - 1];
  const flag = entry.countryFlag || (entry.country ? getFlagEmoji(entry.country) : '🌍');

  const content = (
    <>
      <span className={`${style.medalSize} leading-none mb-2 drop-shadow-sm`} aria-hidden>
        {medal}
      </span>
      <div
        className={`flex ${style.avatarSize} shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white/70 ${style.avatarRing}`}
        style={{
          background: 'linear-gradient(180deg, rgba(177,18,38,0.15) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {entry.avatarUrl ? (
          <img src={entry.avatarUrl} alt="" className="avatar-image h-full w-full" />
        ) : (
          entry.displayName.charAt(0)
        )}
      </div>
      <p className={`mt-2 font-display font-semibold text-white truncate w-full ${style.nameSize}`}>
        {entry.displayName}
      </p>
      <p className="truncate text-[11px] text-white/55 w-full">@{entry.username}</p>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <span className="text-base md:text-lg leading-none shrink-0" aria-hidden>{flag}</span>
        <span className={`font-bold text-[#F2C6CE] tabular-nums ${style.scoreSize}`}>
          {formatScore(entry.score)}
        </span>
        <span className="text-[10px] md:text-[11px] uppercase tracking-wider text-white/45 pb-0.5">pts</span>
      </div>
    </>
  );

  const cardClassName = `group ${style.card}`;
  const cardStyle: React.CSSProperties = {
    background: style.bg,
    border: style.border,
    boxShadow: style.glow,
  };

  if (entry.videoId) {
    return (
      <OpenPerformanceModalTrigger
        videoId={entry.videoId}
        className={`block cursor-pointer hover:scale-[1.02] ${cardClassName}`}
        style={cardStyle}
      >
        {content}
      </OpenPerformanceModalTrigger>
    );
  }

  if (entry.href) {
    return (
      <Link href={entry.href} className={`block hover:scale-[1.02] ${cardClassName}`} style={cardStyle}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClassName} style={cardStyle}>
      {content}
    </div>
  );
}

export default function Top3Leaderboard({ entries }: { entries: Top3Entry[] }) {
  const [first, second, third] = entries.slice(0, 3);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 lg:gap-8 min-w-0">
      {/* #2 — left */}
      {second && (
        <div className="flex justify-center order-2 md:order-1 md:flex-1 md:justify-end">
          <Top3Card entry={second} />
        </div>
      )}
      {/* #1 — center, elevated with subtle lift */}
      {first && (
        <div className="flex justify-center order-1 md:order-2 md:flex-1 md:justify-center -mt-2 md:mt-0 md:-mt-6 md:relative md:z-10">
          <Top3Card entry={first} />
        </div>
      )}
      {/* #3 — right */}
      {third && (
        <div className="flex justify-center order-3 md:flex-1 md:justify-start">
          <Top3Card entry={third} />
        </div>
      )}
    </div>
  );
}
