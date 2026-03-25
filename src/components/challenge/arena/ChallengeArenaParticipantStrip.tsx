'use client';

import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';

export type ArenaParticipant = {
  entryId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  countryCode: string | null;
  joinedAt: string;
};

type Props = {
  participants: ArenaParticipant[];
  participantsTotal: number;
  slug: string;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
};

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white/[0.08] shrink-0"
      />
    );
  }
  const initial = name.trim().charAt(0) || '?';
  return (
    <div
      className="h-11 w-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white/80 ring-2 ring-white/[0.08] shrink-0"
      style={{ background: 'linear-gradient(135deg, rgba(196,18,47,0.35) 0%, rgba(40,40,48,0.9) 100%)' }}
      aria-hidden
    >
      {initial.toUpperCase()}
    </div>
  );
}

export function ChallengeArenaParticipantStrip({
  participants,
  participantsTotal,
  slug,
  onLoadMore,
  hasMore,
  loadingMore,
}: Props) {
  if (participants.length === 0) {
    return (
      <div
        className="rounded-[20px] border border-dashed border-white/[0.12] px-5 py-10 text-center"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <p className="font-display text-[17px] font-semibold text-white mb-2">The arena is open</p>
        <p className="text-[14px] text-white/55 max-w-md mx-auto mb-6 leading-relaxed">
          No creators have entered yet. Be the first to compete — your performance goes straight to the real leaderboard.
        </p>
        <Link
          href={`/upload?challenge=${encodeURIComponent(slug)}`}
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] text-white bg-accent/90 hover:bg-accent transition-colors duration-200"
        >
          Enter the challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-bold shrink-0">In the arena</h3>
        <span className="text-[12px] text-white/40 tabular-nums shrink-0">
          Showing {participants.length.toLocaleString()} of {participantsTotal.toLocaleString()}
        </span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-white/10"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {participants.map((p) => (
          <Link
            key={p.entryId}
            href={`/profile/${encodeURIComponent(p.username)}`}
            className="group flex flex-col items-center gap-2 shrink-0 w-[76px] transition-transform duration-200 hover:scale-[1.03]"
          >
            <div className="relative">
              <Avatar url={p.avatarUrl} name={p.displayName} />
              {p.countryCode ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 text-[14px] leading-none drop-shadow-md"
                  title={p.countryCode}
                >
                  {getFlagEmoji(p.countryCode)}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-white/70 text-center font-medium truncate w-full group-hover:text-white transition-colors">
              {p.displayName}
            </span>
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="text-[13px] font-semibold text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
