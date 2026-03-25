'use client';

/**
 * Challenge competition star rating — premium judging UI.
 * Design: elegant, fair, explainable. No cheap poll-style aesthetics.
 * Black glass + cherry accent; subtle interactions; editorial presentation.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconStar } from '@/components/ui/Icons';

const STARS = [1, 2, 3, 4, 5] as const;

export interface ChallengeStarVoteProps {
  challengeSlug: string;
  videoId: string;
  /** Current user's vote (1–5) or null. */
  myStars: number | null;
  /** Total vote count. */
  votesCount: number;
  /** Average stars (display). */
  averageStars: number;
  onAuthRequired?: () => void;
  onVoteSuccess?: (stars: number, summary: { videoId: string; votesCount: number; averageStars: number }[]) => void;
  variant?: 'inline' | 'compact';
  className?: string;
  stopPropagation?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ChallengeStarVote({
  challengeSlug,
  videoId,
  myStars,
  votesCount,
  averageStars,
  onAuthRequired,
  onVoteSuccess,
  variant = 'inline',
  className = '',
  stopPropagation = false,
}: ChallengeStarVoteProps) {
  const router = useRouter();
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [displayStars, setDisplayStars] = useState<number | null>(myStars);
  const [displayCount, setDisplayCount] = useState(votesCount);
  const [displayAvg, setDisplayAvg] = useState(averageStars);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDisplayStars(myStars);
    setDisplayCount(votesCount);
    setDisplayAvg(averageStars);
  }, [videoId, myStars, votesCount, averageStars]);

  const handleAuthRequired = useCallback(() => {
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      const from = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
      router.push(`/login?from=${from}`);
    }
  }, [onAuthRequired, router]);

  const submitVote = useCallback(
    async (stars: number) => {
      if (loading) return;
      const prevStars = displayStars;
      const prevCount = displayCount;
      const prevAvg = displayAvg;
      const isNewVote = displayStars === null;
      setDisplayStars(stars);
      setDisplayCount(isNewVote ? displayCount + 1 : displayCount);
      setDisplayAvg(
        isNewVote
          ? (displayAvg * displayCount + stars) / (displayCount + 1)
          : (displayAvg * displayCount - (prevStars ?? 0) + stars) / displayCount
      );
      setLoading(true);

      try {
        const res = await fetch(`/api/challenges/${challengeSlug}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, stars }),
        });
        const data = await res.json();

        if (res.status === 401 || data.code === 'UNAUTHORIZED') {
          setDisplayStars(prevStars);
          setDisplayCount(prevCount);
          setDisplayAvg(prevAvg);
          handleAuthRequired();
          return;
        }
        if (!res.ok) {
          setDisplayStars(prevStars);
          setDisplayCount(prevCount);
          setDisplayAvg(prevAvg);
          return;
        }
        if (data.summary && Array.isArray(data.summary)) {
          const entry = data.summary.find((s: { videoId: string }) => s.videoId === videoId);
          if (entry) {
            setDisplayCount(entry.votesCount);
            setDisplayAvg(entry.averageStars);
          }
          onVoteSuccess?.(stars, data.summary);
        }
      } catch {
        setDisplayStars(prevStars);
        setDisplayCount(prevCount);
        setDisplayAvg(prevAvg);
      } finally {
        setLoading(false);
      }
    },
    [
      challengeSlug,
      videoId,
      loading,
      displayStars,
      displayCount,
      displayAvg,
      handleAuthRequired,
      onVoteSuccess,
    ]
  );

  const effectiveStars = hoverStars ?? displayStars;
  const isCompact = variant === 'compact';

  const handleClick = (e: React.MouseEvent, stars: number) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    submitVote(stars);
  };

  const handleMouseEnter = (e: React.MouseEvent, stars: number) => {
    if (stopPropagation) e.stopPropagation();
    setHoverStars(stars);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    setHoverStars(null);
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 shrink-0 min-h-[20px] ${className}`}
      onClick={(e) => stopPropagation && e.stopPropagation()}
      onMouseEnter={(e) => stopPropagation && e.stopPropagation()}
      onMouseLeave={(e) => stopPropagation && e.stopPropagation()}
      role="group"
      aria-label="Challenge judging: rate this performance 1–5 stars"
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {STARS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={(e) => handleClick(e, s)}
            onMouseEnter={(e) => handleMouseEnter(e, s)}
            onMouseLeave={handleMouseLeave}
            disabled={loading}
            className={`
              p-0.5 rounded transition-all duration-200 ease-out
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              ${s <= (effectiveStars ?? 0) ? 'text-accent' : 'text-white/30'}
            `}
            aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
          >
            <IconStar
              className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
              fill={s <= (effectiveStars ?? 0) ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </span>
      <span className={`tabular-nums font-medium text-white/90 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
        {displayAvg > 0 ? displayAvg.toFixed(1) : '—'}
      </span>
      {!isCompact && (
        <span className={`tabular-nums text-white/50 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
          · {displayCount > 0 ? formatCount(displayCount) : '0'} {displayCount === 1 ? 'rating' : 'ratings'}
        </span>
      )}
    </span>
  );
}
