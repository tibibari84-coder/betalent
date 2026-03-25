'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconHeart } from '@/components/ui/Icons';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export interface LikeButtonProps {
  videoId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  /** Called after successful toggle; use to sync parent state (e.g. modal). */
  onToggle?: (liked: boolean, likesCount: number) => void;
  /** Called when API returns 401 (not logged in). Default: redirect to /login?from=currentPath */
  onAuthRequired?: () => void;
  /** 'button' = full button (modal); 'inline' = icon + count (cards); 'buttonCompact' = button style but icon + count only (detail page); 'rail' = vertical icon + count (feed action rail). */
  variant?: 'button' | 'buttonCompact' | 'inline' | 'rail';
  className?: string;
  /** Button variant: label text (e.g. "Like"). Omitted in buttonCompact. */
  label?: string;
  /** Prevent parent click (e.g. card link). Call e.stopPropagation() in onClick. */
  stopPropagation?: boolean;
}

export default function LikeButton({
  videoId,
  initialLiked,
  initialLikesCount,
  onToggle,
  onAuthRequired,
  variant = 'button',
  className = '',
  label,
  stopPropagation = false,
}: LikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikesCount(initialLikesCount);
  }, [videoId, initialLiked, initialLikesCount]);

  const handleAuthRequired = useCallback(() => {
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      const from = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
      router.push(`/login?from=${from}`);
    }
  }, [onAuthRequired, router]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (loading) return;

      const prevLiked = liked;
      const prevCount = likesCount;
      setLiked(!liked);
      setLikesCount((c) => (liked ? c - 1 : c + 1));
      setLoading(true);

      try {
        const url = '/api/like';
        const res = liked
          ? await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }) })
          : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }) });
        const data = await res.json();

        if (res.status === 401) {
          setLiked(prevLiked);
          setLikesCount(prevCount);
          handleAuthRequired();
          return;
        }
        if (!res.ok || !data.ok) {
          setLiked(prevLiked);
          setLikesCount(prevCount);
          return;
        }
        const newLiked = data.liked ?? !prevLiked;
        const newCount = typeof data.likesCount === 'number' ? data.likesCount : prevCount;
        setLiked(newLiked);
        setLikesCount(newCount);
        onToggle?.(newLiked, newCount);
      } catch {
        setLiked(prevLiked);
        setLikesCount(prevCount);
      } finally {
        setLoading(false);
      }
    },
    [videoId, liked, likesCount, loading, onToggle, handleAuthRequired, stopPropagation]
  );

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 shrink-0 min-h-[20px] text-[#f1f5f9] hover:text-white transition-colors disabled:opacity-70 ${className}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <IconHeart className={`w-4 h-4 shrink-0 ${liked ? 'fill-current text-accent' : ''}`} aria-hidden />
        <span className="tabular-nums font-medium text-[12px]">{formatCount(likesCount)}</span>
        {label != null && label !== '' && <span className="sr-only">{label}</span>}
      </button>
    );
  }

  if (variant === 'rail') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/90 hover:text-white active:scale-95 transition-transform disabled:opacity-70 ${className}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <IconHeart className={`w-7 h-7 shrink-0 ${liked ? 'fill-current text-accent' : ''}`} aria-hidden />
        <span className="text-[11px] font-medium tabular-nums">{formatCount(likesCount)}</span>
      </button>
    );
  }

  const modalButtonClass = `flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] transition-all duration-200 ${
    liked
      ? 'bg-[#c4122f]/12 text-[#e8a0a8] border border-[#c4122f]/20'
      : 'bg-white/[0.03] text-white/85 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.09]'
  } disabled:opacity-70 ${className}`;

  const detailButtonClass = `flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium min-h-[44px] transition-colors ${
    liked
      ? 'bg-accent/20 text-accent border border-accent/30'
      : 'bg-canvas-tertiary border border-transparent text-text-secondary hover:text-text-primary hover:border-white/10'
  } disabled:opacity-70 ${className}`;

  if (variant === 'buttonCompact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={detailButtonClass}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <IconHeart className={`w-5 h-5 shrink-0 ${liked ? 'fill-current' : ''}`} aria-hidden />
        <span className="tabular-nums">{formatCount(likesCount)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={modalButtonClass}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <IconHeart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} aria-hidden />
      {label ?? 'Like'}
      <span className="tabular-nums">{formatCount(likesCount)}</span>
    </button>
  );
}

export { formatCount as formatLikeCount };
