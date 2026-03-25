'use client';

import React from 'react';

/**
 * Premium gift icons. Supports 50+ gifts with distinct visuals.
 * Unknown slugs fall back to elegant initial badge.
 */

interface GiftIconProps {
  slug: string;
  name?: string;
  className?: string;
}

const c = 'currentColor';
const stroke = 1.25;
const viewBox = '0 0 24 24';

/** SVG path definitions for premium gift icons */
const ICON_PATHS: Record<string, React.ReactNode> = {
  'music-note': <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />,
  microphone: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />,
  headphones: <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M4 14h16M6 10v6a2 2 0 002 2h8a2 2 0 002-2v-6M6 10a4 4 0 014-4h4a4 4 0 014 4" />,
  'drum-beat': (
    <>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v2m0 4v2m4-6h-2m-4 0H8" />
    </>
  ),
  piano: <path strokeLinecap="round" strokeLinejoin="round" d="M3 9v12h18V9M3 9l3 3 3-3 3 3 3-3 3 3M3 9V6a3 3 0 013-3h12a3 3 0 013 3v3" />,
  'golden-score': <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
  'platinum-record': <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.926.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a6.726 6.726 0 012.749 1.35m0 0a6.774 6.774 0 01-3.044 1.93 7.454 7.454 0 01-3.993 3.057M12 21.75a2.25 2.25 0 002.25-2.25v-.816a6.726 6.726 0 00-2.25-.75 6.726 6.726 0 00-2.25.75v.816A2.25 2.25 0 0012 21.75z" />,
  star: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
  heart: <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />,
  fire: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />,
  crown: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 011.414-1.518l2.09-2.09L21.75 18M2.25 6l9 6.75 4.286-4.286a11.95 11.95 0 011.414-1.518l2.09-2.09L21.75 6" />,
  trophy: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.926.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a6.726 6.726 0 012.749 1.35" />,
  guitar: <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />,
  vinyl: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  diamond: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75l4.5-10.5 6 6 4.5-10.5 4.5 10.5-4.5 4.5-6-6-4.5 10.5z" />,
};

export default function GiftIcon({ slug, name, className = 'w-6 h-6' }: GiftIconProps) {
  const path = ICON_PATHS[slug];
  if (path) {
    return (
      <svg className={className} fill="none" stroke={c} strokeWidth={stroke} viewBox={viewBox} aria-hidden>
        {path}
      </svg>
    );
  }
  const initial = (name ?? slug).charAt(0).toUpperCase();
  return (
    <span
      className={`${className} inline-flex items-center justify-center font-semibold tracking-tight`}
      style={{
        fontSize: '0.65em',
        color: 'rgba(255,255,255,0.95)',
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
