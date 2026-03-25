'use client';

import { useCallback, useState } from 'react';

/**
 * Manages active video index for vertical feed.
 * Ensures only one video plays at a time.
 */
export function useActiveVideo(totalCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  const setActive = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(index, totalCount - 1));
      return prev === next ? prev : next;
    });
  }, [totalCount]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, totalCount - 1));
  }, [totalCount]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const isActive = useCallback(
    (index: number) => activeIndex === index,
    [activeIndex]
  );

  return { activeIndex, setActive, goNext, goPrev, isActive };
}
