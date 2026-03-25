'use client';

import { useState, useEffect } from 'react';
import { IconPlus } from '@/components/ui/Icons';

interface FollowButtonProps {
  targetId: string;
  initialFollowing?: boolean;
  /** Called after successful toggle (or rollback). followersCount is the creator's new count when returned by API. */
  onToggle?: (following: boolean, followersCount?: number) => void;
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'compact' | 'icon';
  /** `rail` = vertical stack for full-screen feed sidebar (icon + label). */
  layout?: 'default' | 'rail';
  className?: string;
  /** Optional: use when inside a clickable parent to avoid navigation. */
  stopPropagation?: boolean;
}

export default function FollowButton({
  targetId,
  initialFollowing = false,
  onToggle,
  variant = 'primary',
  size = 'default',
  layout = 'default',
  className = '',
  stopPropagation = false,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [targetId, initialFollowing]);

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;

    const prev = following;
    const next = !prev;

    setFollowing(next);
    onToggle?.(next);
    setLoading(true);

    try {
      const res = await fetch('/api/follow', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: targetId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setFollowing(prev);
        onToggle?.(prev);
        if (typeof window !== 'undefined') {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
      }

      if (!res.ok || !data.ok) {
        setFollowing(prev);
        onToggle?.(prev);
      } else {
        const serverFollowing = typeof data.following === 'boolean' ? data.following : next;
        const followersCount = typeof data.followersCount === 'number' ? data.followersCount : undefined;
        if (serverFollowing !== next) {
          setFollowing(serverFollowing);
        }
        onToggle?.(serverFollowing, followersCount);
      }
    } catch {
      setFollowing(prev);
      onToggle?.(prev);
    } finally {
      setLoading(false);
    }
  };

  const isPrimary = variant === 'primary' && !following;
  const baseClass = isPrimary ? 'btn-primary' : 'btn-secondary';
  const sizeClass =
    size === 'icon'
      ? 'h-9 w-9 min-h-9 min-w-9 p-0 rounded-full text-[13px] gap-0 border border-white/20 bg-[rgba(26,26,28,0.75)] hover:bg-white/10'
      : size === 'compact'
        ? 'h-[32px] min-h-[32px] px-3 rounded-[10px] text-[13px] gap-1.5'
        : 'min-h-[44px] rounded-[12px] gap-2 text-[14px]';
  const followingMod =
    following && size !== 'icon'
      ? '!bg-canvas-tertiary !border-[rgba(255,255,255,0.08)] text-text-secondary hover:!border-[rgba(255,255,255,0.12)] hover:!bg-white/5'
      : following && size === 'icon'
        ? '!bg-accent/20 !border-accent/40 text-accent'
        : '';

  if (layout === 'rail') {
    return (
      <button
        type="button"
        onClick={(e) => handleClick(e)}
        disabled={loading}
        className={`flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/90 hover:text-white active:scale-95 transition-all duration-200 disabled:opacity-60 ${className}`}
        aria-label={following ? 'Unfollow' : 'Follow'}
      >
        <span
          className={`flex items-center justify-center rounded-full w-11 h-11 overflow-hidden border-2 transition-all duration-200 ${
            following ? 'bg-accent/20 border-accent/40 text-accent' : 'border-white/30 text-white bg-black/20'
          }`}
        >
          <IconPlus className={`w-6 h-6 shrink-0 transition-transform duration-200 ${following ? 'rotate-45' : ''}`} />
        </span>
        <span className="text-[10px] font-medium leading-tight">{following ? 'Following' : 'Follow'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => handleClick(e)}
      disabled={loading}
      className={`inline-flex items-center justify-center font-semibold transition-all disabled:opacity-60 shrink-0 ${baseClass} ${sizeClass} ${followingMod} ${className}`}
      aria-label={size === 'icon' ? (following ? 'Unfollow' : 'Follow') : undefined}
    >
      <IconPlus
        className={`shrink-0 ${size === 'icon' ? 'w-4 h-4' : size === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${following ? 'opacity-70' : ''} ${size === 'icon' && following ? '!opacity-100 rotate-45' : ''}`}
      />
      {size !== 'icon' && (following ? 'Following' : 'Follow')}
    </button>
  );
}
