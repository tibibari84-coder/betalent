'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardRankBadgeProps {
  videoId: string;
  /** Inline = small pill, card = badge on card overlay */
  variant?: 'inline' | 'card';
  className?: string;
}

export default function LeaderboardRankBadge({
  videoId,
  variant = 'inline',
  className = '',
}: LeaderboardRankBadgeProps) {
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    fetch(`/api/videos/${encodeURIComponent(videoId)}/leaderboard-status?period=weekly&scope=global`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok && typeof res.rank === 'number') {
          setRank(res.rank);
        } else {
          setRank(null);
        }
      })
      .catch(() => setRank(null))
      .finally(() => setLoading(false));
  }, [videoId]);

  if (loading || rank == null) return null;

  if (variant === 'card') {
    /* Top-left: keeps top-right free for VideoActionsMenu (3-dots) */
    return (
      <Link
        href="/leaderboard?target=performance&period=weekly"
        className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11px] font-semibold text-white ${className}`}
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span aria-hidden>🏆</span>
        #{rank}
      </Link>
    );
  }

  return (
    <Link
      href="/leaderboard?target=performance&period=weekly"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{
        background: 'rgba(196,18,47,0.2)',
        border: '1px solid rgba(196,18,47,0.35)',
        color: '#F2B6C0',
      }}
    >
      <span aria-hidden>🏆</span>
      #{rank}
    </Link>
  );
}
