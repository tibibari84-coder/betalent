'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DEFAULT_CHALLENGE_HERO_IMAGE } from '@/constants/challenge-hero';

type Props = {
  /** Prefer #1 ranked entry thumbnail when available — real challenge imagery. */
  imageUrl?: string | null;
  children: ReactNode;
  className?: string;
};

/**
 * Full-width challenge hero: concert photo + brand gradients + subtle color lights (matches `/trending` hero).
 * Uses an <img> layer (not CSS url()) so signed / query-heavy thumbnail URLs cannot break the entire background.
 */
export function ChallengeHeroBackdrop({ imageUrl, children, className = '' }: Props) {
  const raw = imageUrl?.trim();
  const preferred = raw && raw.length > 0 ? raw : DEFAULT_CHALLENGE_HERO_IMAGE;
  const [photoSrc, setPhotoSrc] = useState(preferred);

  useEffect(() => {
    setPhotoSrc(preferred);
  }, [preferred]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={photoSrc}
        alt=""
        aria-hidden
        className="absolute inset-0 z-0 h-full w-full object-cover pointer-events-none"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => {
          setPhotoSrc((s) => (s === DEFAULT_CHALLENGE_HERO_IMAGE ? s : DEFAULT_CHALLENGE_HERO_IMAGE));
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(177,18,38,0.34) 0%, rgba(13,13,14,0.88) 52%)',
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0D0D0E] via-black/40 to-black/15 pointer-events-none" />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.92]"
        style={{
          background:
            'radial-gradient(ellipse 85% 55% at 50% -5%, rgba(196,18,47,0.32) 0%, transparent 52%), radial-gradient(ellipse 55% 45% at 100% 10%, rgba(120,160,255,0.12) 0%, transparent 45%), radial-gradient(ellipse 50% 42% at 0% 85%, rgba(212,175,55,0.08) 0%, transparent 48%)',
        }}
      />
      <div className="relative z-[1] min-w-0">{children}</div>
    </div>
  );
}
