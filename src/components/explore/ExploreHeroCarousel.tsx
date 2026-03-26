'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconTrophy, IconPlay } from '@/components/ui/Icons';

const SLIDES = [
  {
    id: 'discover',
    eyebrow: 'Discover Talent',
    title: 'Show the World Your Talent',
    description: 'Join the stage. Share your voice. Discover standout performers and rising talent.',
    cta: 'Join the Stage',
    ctaSecondary: 'Watch Performances',
    ctaHref: '/upload',
    ctaSecondaryHref: '#featured-performers',
    variant: 'mic' as const,
  },
  {
    id: 'challenges',
    eyebrow: 'Live Challenges',
    title: 'Compete in Weekly Live Challenges',
    description: 'Vote, support, and watch talent rise. Win the spotlight.',
    cta: 'Join Challenge',
    ctaHref: '/challenges',
    ctaSecondary: null,
    ctaSecondaryHref: null,
    variant: 'trophy' as const,
  },
  {
    id: 'trending',
    eyebrow: 'Trending Voices',
    title: 'Watch Rising Performers',
    description: 'See who\'s rising. Top talent by views, votes, and engagement.',
    cta: 'Watch Now',
    ctaHref: '/trending',
    ctaSecondary: null,
    ctaSecondaryHref: null,
    variant: 'trending' as const,
  },
] as const;

const AUTO_SLIDE_MS = 5500;

/** Premium trophy logo — challenge variant */
function TrophyLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2B6C0" stopOpacity="1" />
          <stop offset="100%" stopColor="#c4122f" stopOpacity="0.9" />
        </linearGradient>
        <filter id="trophyGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#trophyGlow)">
        <path d="M40 18v8M28 26h24M26 26v20c0 8 6 14 14 14s14-6 14-14V26M26 26h-4c-4 0-6-2-6-6v-2h36v2c0 4-2 6-6 6h-4" stroke="url(#trophyGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.95" />
        <path d="M32 46h16M36 46v8M44 46v8M38 54h4" stroke="url(#trophyGrad)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.9" />
        <ellipse cx="40" cy="62" rx="8" ry="2" stroke="url(#trophyGrad)" strokeWidth="2" strokeOpacity="0.8" fill="none" />
      </g>
    </svg>
  );
}

/** Premium waveform/trending logo */
function TrendingLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="trendGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c4122f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F2B6C0" stopOpacity="1" />
        </linearGradient>
        <filter id="trendGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#trendGlow)">
        {[12, 24, 36, 48, 60].map((x, i) => (
          <rect key={i} x={x} y={40 - i * 6} width={8} height={20 + i * 8} rx={8} fill="url(#trendGrad)" fillOpacity={0.9 - i * 0.08} />
        ))}
      </g>
    </svg>
  );
}

/** Premium energy ring — 260–320px, cherry/magenta/violet glow, floating, cinematic */
function EnergyRing({ variant, isActive }: { variant: 'mic' | 'trophy' | 'trending'; isActive: boolean }) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center transition-transform duration-300"
      style={{ animation: 'heroFloat 4s ease-in-out infinite' }}
    >
      {/* Radial gradient glow behind circle — neutral, no cherry */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-10%',
          background: 'radial-gradient(circle at center, rgba(60,60,65,0.12) 0%, rgba(30,30,32,0.06) 40%, transparent 70%)',
        }}
        aria-hidden
      />
      {/* Outer glowing ring — gradient stroke, cherry accent only when active */}
      <div
        className={`absolute inset-0 rounded-full ${isActive ? 'hero-ring-pulse' : ''}`}
        style={{
          padding: 4,
          background: isActive
            ? 'linear-gradient(135deg, rgba(196,18,47,0.4), rgba(196,18,47,0.2), rgba(255,255,255,0.06))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
          boxShadow: isActive ? '0 0 24px rgba(255, 60, 80, 0.04), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Inner dark glass circle */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background:
              variant === 'mic'
                ? 'rgba(0,0,0,0.25)'
                : 'rgba(0,0,0,0.6)',
            backdropFilter: variant === 'mic' ? 'blur(8px)' : 'blur(12px)',
            WebkitBackdropFilter: variant === 'mic' ? 'blur(8px)' : 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {variant === 'mic' && (
            <Image
              src="/images/betalent-vinyl-logo.png"
              alt=""
              fill
              className="object-cover rounded-full"
              sizes="(max-width: 640px) 260px, (max-width: 1024px) 320px, 420px"
              priority
            />
          )}
          {variant === 'trophy' && <TrophyLogo className="w-20 h-20 md:w-24 md:h-24 laptop:w-28 laptop:h-28 desktop:w-32 desktop:h-32" />}
          {variant === 'trending' && <TrendingLogo className="w-20 h-20 md:w-24 md:h-24 laptop:w-28 laptop:h-28 desktop:w-32 desktop:h-32" />}
        </div>
      </div>
    </div>
  );
}

export default function ExploreHeroCarousel() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(index, SLIDES.length - 1)));
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const t = setInterval(next, AUTO_SLIDE_MS);
    return () => clearInterval(t);
  }, [next]);

  return (
    <div
      className="relative flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-8 xl:gap-10 min-h-[380px] laptop:min-h-[420px] desktop:min-h-[460px] rounded-[24px] overflow-hidden min-w-0 w-full"
      style={{
        border: '1px solid rgba(255, 70, 90, 0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Background image — all slides, slightly brighter so cherry/purple glow pops */}
      <div className="absolute inset-0 z-0" aria-hidden style={{ filter: 'brightness(1.15) contrast(1.05)' }}>
        <Image
          src="/images/hero-show-your-voice.png"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
      </div>
      {/* Glass overlay — black luxury glass, lighter so image shows through more */}
      <div
        className="absolute inset-0 z-[1] rounded-[24px]"
        style={{
          background: 'rgba(12, 12, 14, 0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        aria-hidden
      />
      {/* Copy: full width when stacked; min readable width when beside visual (prevents “vertical title” squeeze) */}
      <div className="relative z-10 flex flex-col justify-center p-8 sm:p-10 laptop:p-12 desktop:p-14 w-full min-w-0 flex-1 lg:min-w-[min(100%,360px)] lg:max-w-[min(100%,640px)]">
        <div className="relative min-h-[200px] lg:min-h-[220px] w-full min-w-0">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              className="transition-all duration-500 ease-out"
              style={{
                opacity: i === current ? 1 : 0,
                transform: `translateX(${i === current ? 0 : i < current ? -16 : 16}px)`,
                position: i === current ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                right: 0,
                pointerEvents: i === current ? 'auto' : 'none',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent/95 mb-4">
                {slide.eyebrow}
              </p>
              <h2 className="font-display text-[clamp(1.75rem,calc(2.8vw_+_0.5rem),2.75rem)] font-bold text-white mb-5 leading-[1.12] tracking-[-0.02em] text-left break-words">
                {slide.title}
              </h2>
              <p className="text-[15px] md:text-[16px] text-white/65 mb-8 md:mb-10 max-w-[52ch] leading-[1.65] text-left">
                {slide.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={slide.ctaHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[14px] text-white border border-white/20 hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(196,18,47,0.9), rgba(177,18,38,0.85))',
                    boxShadow: '0 8px 32px rgba(196,18,47,0.12)',
                  }}
                >
                  <IconPlay className="w-4 h-4 shrink-0" aria-hidden />
                  {slide.cta}
                </Link>
                {slide.ctaSecondary && slide.ctaSecondaryHref && (
                  <Link
                    href={slide.ctaSecondaryHref}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[14px] border border-white/20 text-white hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] transition-all duration-200"
                  >
                    {slide.ctaSecondary}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual: never steal min-width from copy; center on small, end-align on lg+; min size so ring never collapses on wide viewport */}
      <div className="explore-hero-visual relative z-10 flex shrink-0 items-center justify-center lg:justify-end w-full lg:w-auto lg:max-w-[min(100%,44%)] lg:min-w-[280px] px-4 pb-6 lg:px-6 lg:pb-0 laptop:pr-8 desktop:pr-10 min-w-0">
        <div className="relative w-full min-w-[200px] max-w-[280px] sm:max-w-[320px] aspect-square lg:max-w-[340px] lg:min-w-[260px] laptop:max-w-[380px] laptop:min-w-[280px] desktop:max-w-[420px] desktop:min-w-[320px]">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
              style={{
                opacity: i === current ? 1 : 0,
                transform: `scale(${i === current ? 1 : 0.88})`,
                pointerEvents: 'none',
              }}
            >
              <EnergyRing variant={slide.variant} isActive={i === current} />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="absolute bottom-5 laptop:bottom-6 left-6 laptop:left-10 desktop:left-12 z-20 flex items-center gap-3">
        <span className="text-[12px] font-medium text-white/60 tabular-nums">
          {current + 1} / {SLIDES.length}
        </span>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                background: i === current ? 'rgba(196,18,47,0.95)' : 'rgba(255,255,255,0.2)',
                transform: i === current ? 'scale(1.2)' : 'scale(1)',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
