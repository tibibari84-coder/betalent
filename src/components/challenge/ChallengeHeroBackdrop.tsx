'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DEFAULT_CHALLENGE_HERO_IMAGE } from '@/constants/challenge-hero';

type Props = {
  /** Prefer #1 ranked entry thumbnail when available — real challenge imagery. */
  imageUrl?: string | null;
  children: ReactNode;
  className?: string;
  /** Extra depth: animated cherry glow, noise, vignette (challenges hub list page). */
  cinematic?: boolean;
};

/**
 * Full-width challenge hero: concert photo + brand gradients + subtle color lights (matches `/trending` hero).
 * Uses an <img> layer (not CSS url()) so signed / query-heavy thumbnail URLs cannot break the entire background.
 */
export function ChallengeHeroBackdrop({ imageUrl, children, className = '', cinematic = false }: Props) {
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
        className={`absolute inset-0 z-0 h-full w-full object-cover pointer-events-none ${cinematic ? 'scale-[1.06]' : ''}`}
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
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0D0D0E] via-black/50 to-black/20 pointer-events-none" />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.92]"
        style={{
          background:
            'radial-gradient(ellipse 85% 55% at 50% -5%, rgba(196,18,47,0.32) 0%, transparent 52%), radial-gradient(ellipse 55% 45% at 100% 10%, rgba(120,160,255,0.12) 0%, transparent 45%), radial-gradient(ellipse 50% 42% at 0% 85%, rgba(212,175,55,0.08) 0%, transparent 48%)',
        }}
      />
      {cinematic ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -left-1/4 top-0 z-[1] h-[min(85%,520px)] w-[min(120%,680px)] rounded-full bg-[#c4122f] opacity-40 blur-[100px] challenges-hero-blob-a"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-1/4 bottom-0 z-[1] h-[min(70%,420px)] w-[min(100%,520px)] rounded-full bg-[#7f1d1d] opacity-35 blur-[90px] challenges-hero-blob-b"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                'radial-gradient(ellipse 75% 55% at 50% 50%, transparent 0%, rgba(7,7,7,0.55) 72%, rgba(7,7,7,0.96) 100%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] backdrop-blur-[2px]"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
            }}
          />
        </>
      ) : null}
      <div className="relative z-[2] min-w-0">{children}</div>
    </div>
  );
}
