'use client';

import { useEffect, useRef } from 'react';

const PRELOAD_MARGIN = 0.3; // Preload when within 30% of viewport

/**
 * Preloads video when element is near viewport.
 * Uses IntersectionObserver with rootMargin to trigger preload before visible.
 */
export function useVideoPreload(
  videoUrl: string | null | undefined,
  isNearViewport: boolean,
  root: HTMLElement | null
) {
  const preloadedRef = useRef(false);

  useEffect(() => {
    if (!videoUrl || !root) return;
    if (preloadedRef.current) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = videoUrl;
    document.head.appendChild(link);
    preloadedRef.current = true;

    return () => {
      link.remove();
    };
  }, [videoUrl, isNearViewport, root]);
}
