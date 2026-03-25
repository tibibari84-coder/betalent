'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { getRequiredQualifiedWatchSeconds } from '@/lib/view-qualification';
import { postQualifiedView } from '@/lib/view-tracking-client';

const VISIBILITY_IO_THRESHOLD = 0.55;

/**
 * Accumulates **playback** time (monotonic currentTime deltas) only while the player
 * is sufficiently visible, tab visible, unpaused, and `enabled` — then POSTs one qualified view.
 */
export function useQualifiedViewTracking({
  videoId,
  durationSec,
  enabled,
  videoRef,
  containerRef,
  source,
  /** When the <video> src changes or mounts, listeners re-attach. */
  mediaKey,
}: {
  videoId: string;
  durationSec: number;
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  source: 'feed' | 'detail' | 'modal';
  mediaKey: string;
}) {
  const visibleEnoughRef = useRef(false);
  const accumRef = useRef(0);
  const lastVideoTimeRef = useRef<number | null>(null);
  const sentRef = useRef(false);
  const tabVisibleRef = useRef(true);

  useEffect(() => {
    accumRef.current = 0;
    lastVideoTimeRef.current = null;
    sentRef.current = false;
  }, [videoId]);

  useEffect(() => {
    if (!enabled) {
      accumRef.current = 0;
      lastVideoTimeRef.current = null;
      sentRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    const onVis = () => {
      tabVisibleRef.current = document.visibilityState === 'visible';
    };
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const r = entries[0]?.intersectionRatio ?? 0;
        visibleEnoughRef.current = r >= VISIBILITY_IO_THRESHOLD;
      },
      { threshold: [0, 0.25, 0.45, 0.55, 0.65, 0.75, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef, videoId]);

  useEffect(() => {
    if (!enabled) {
      lastVideoTimeRef.current = null;
      return;
    }

    const v = videoRef.current;
    if (!v) return;

    const required = getRequiredQualifiedWatchSeconds(durationSec);

    const onTime = () => {
      if (!tabVisibleRef.current || !visibleEnoughRef.current) {
        lastVideoTimeRef.current = null;
        return;
      }
      if (v.paused) {
        lastVideoTimeRef.current = null;
        return;
      }

      const now = v.currentTime;
      if (lastVideoTimeRef.current == null) {
        lastVideoTimeRef.current = now;
        return;
      }

      const dt = now - lastVideoTimeRef.current;
      lastVideoTimeRef.current = now;
      if (dt < 0 || dt > 2.5) return;

      accumRef.current += dt;

      if (!sentRef.current && accumRef.current >= required) {
        sentRef.current = true;
        const claimed = Math.min(accumRef.current, Math.max(durationSec, 1) + 2);
        void postQualifiedView({
          videoId,
          qualifiedWatchSeconds: claimed,
          durationSecondsClient: durationSec,
          source,
        });
      }
    };

    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [enabled, videoId, durationSec, source, videoRef, mediaKey]);
}
