'use client';

import Link from 'next/link';
import OpenPerformanceModalTrigger from '@/components/performance/OpenPerformanceModalTrigger';

export type LeaderboardRowEntry = {
  rank: number;
  avatarUrl?: string | null;
  displayName: string;
  username: string;
  score: number;
  href?: string;
  videoId?: string;
};

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

function LeaderboardRow({ entry }: { entry: LeaderboardRowEntry }) {
  const content = (
    <>
      <span className="w-8 shrink-0 text-[14px] font-bold text-white/55 tabular-nums">#{entry.rank}</span>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white/60"
          style={{
            background: 'linear-gradient(180deg, rgba(177,18,38,0.12), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="avatar-image h-full w-full" />
          ) : (
            entry.displayName.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white">{entry.displayName}</p>
          <p className="truncate text-[11px] text-white/50">@{entry.username}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end">
        <span className="text-[13px] font-semibold text-white tabular-nums min-w-[3.5rem] text-right">
          {formatScore(entry.score)} <span className="text-[10px] font-normal text-white/45">pts</span>
        </span>
      </div>
    </>
  );

  const rowClass =
    'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 px-4 py-3 sm:px-5 md:px-6 md:py-3.5 min-w-0 transition-colors hover:bg-white/[0.04] border-b border-white/[0.04] last:border-b-0';

  if (entry.videoId) {
    return (
      <OpenPerformanceModalTrigger videoId={entry.videoId} className={`block text-left ${rowClass}`}>
        {content}
      </OpenPerformanceModalTrigger>
    );
  }

  if (entry.href) {
    return (
      <Link href={entry.href} className={`block ${rowClass}`}>
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}

type Props = {
  entries: LeaderboardRowEntry[];
};

export default function LeaderboardTable({ entries }: Props) {
  const rows = entries;

  return (
    <div className="min-w-0">
      {/* Table header */}
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 px-4 py-2.5 sm:px-5 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-white/45 border-b border-white/[0.06]"
      >
        <span className="w-8">Rank</span>
        <span>Performer</span>
        <span className="text-right min-w-[3.5rem]">Score</span>
      </div>
      {rows.map((entry) => (
        <LeaderboardRow key={`${entry.username}-${entry.rank}`} entry={entry} />
      ))}
    </div>
  );
}
