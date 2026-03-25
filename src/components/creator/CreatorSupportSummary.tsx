'use client';

import Link from 'next/link';
import { IconGift } from '@/components/ui/Icons';

export type CreatorSupportSummaryData = {
  totalGiftSupport: number;
  totalSuperVoteSupport: number;
  totalSupportCoins: number;
  totalGiftsReceived?: number;
};

export type RecentSupporter = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalCoinsSent: number;
};

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface CreatorSupportSummaryProps {
  data: CreatorSupportSummaryData;
  recentSupporters?: RecentSupporter[];
  /** When set, links to profile; otherwise compact inline */
  profileUsername?: string;
  /** Compact variant: single row, no card wrapper (e.g. for earnings page) */
  variant?: 'card' | 'compact';
}

/**
 * Premium, compact creator support summary: gift support, super vote support, total, optional recent activity.
 * Does not change parent layout dimensions.
 */
export default function CreatorSupportSummary({
  data,
  recentSupporters = [],
  profileUsername,
  variant = 'card',
}: CreatorSupportSummaryProps) {
  const hasAnySupport =
    data.totalSupportCoins > 0 ||
    data.totalGiftSupport > 0 ||
    data.totalSuperVoteSupport > 0;
  const hasRecent = recentSupporters.length > 0;

  const content = (
    <>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/50 font-medium">
            Gifts
          </p>
          <p className="text-[15px] sm:text-[16px] font-semibold text-white tabular-nums mt-1 truncate">
            {formatCoins(data.totalGiftSupport)}
          </p>
          <p className="text-[11px] text-white/45 mt-0.5">coins</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/50 font-medium">
            Super votes
          </p>
          <p className="text-[15px] sm:text-[16px] font-semibold text-white tabular-nums mt-1 truncate">
            {formatCoins(data.totalSuperVoteSupport)}
          </p>
          <p className="text-[11px] text-white/45 mt-0.5">coins</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/50 font-medium">
            Total
          </p>
          <p className="text-[15px] sm:text-[16px] font-semibold text-white tabular-nums mt-1 truncate">
            {formatCoins(data.totalSupportCoins)}
          </p>
          <p className="text-[11px] text-white/45 mt-0.5">coins</p>
        </div>
      </div>

      {hasRecent && variant === 'card' && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/50 font-medium mb-2">
            Recent supporters
          </p>
          <ul className="space-y-1.5">
            {recentSupporters.slice(0, 4).map((s) => (
              <li key={s.userId}>
                <Link
                  href={`/profile/${encodeURIComponent(s.username)}`}
                  className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors min-w-0"
                >
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[11px] font-medium bg-white/[0.08] text-white/80"
                  >
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" className="avatar-image h-full w-full" />
                    ) : (
                      (s.displayName || s.username).charAt(0)
                    )}
                  </div>
                  <span className="text-[13px] text-white truncate min-w-0">
                    {s.displayName || s.username}
                  </span>
                  <span className="text-[12px] text-white/55 tabular-nums ml-auto shrink-0 font-medium">
                    {formatCoins(s.totalCoinsSent)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  if (variant === 'compact') {
    return (
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset',
        }}
      >
        {content}
      </div>
    );
  }

  if (!hasAnySupport && !hasRecent) return null;

  return (
    <section
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'rgba(18,22,31,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06]"
            aria-hidden
          >
            <IconGift className="w-3.5 h-3.5 text-white/70" />
          </span>
          <h3 className="font-display text-[14px] font-semibold text-white tracking-tight">
            Your support
          </h3>
          {profileUsername && (
            <Link
              href={`/profile/${encodeURIComponent(profileUsername)}`}
              className="text-[11px] text-white/50 hover:text-white/80 ml-auto transition-colors"
            >
              View profile
            </Link>
          )}
        </div>
        {content}
      </div>
    </section>
  );
}
