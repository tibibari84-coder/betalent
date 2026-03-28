'use client';

import { useEffect, useState } from 'react';
import type { LegacyRef, RefObject } from 'react';
import { cn } from '@/lib/utils';

export type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Front camera: mirror for natural selfie UX. */
  mirror?: boolean;
  className?: string;
};

/**
 * Mobile: preview lives in a **true 9:16** frame (largest that fits the screen) — not a 16:9 strip
 * letterboxed in portrait. Video uses **`object-contain`** only (full frame visible, no cover “zoom”).
 * Desktop: unchanged full-area contain.
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  const [mobileStudio, setMobileStudio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setMobileStudio(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const videoClass = cn(
    'bg-black object-contain object-center',
    mirror && '-scale-x-100'
  );

  if (!mobileStudio) {
    return (
      <video
        ref={videoRef as LegacyRef<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        className={cn('absolute inset-0 h-full w-full', videoClass, className)}
      />
    );
  }

  return (
    <div className={cn('absolute inset-0 flex h-full w-full items-center justify-center bg-black', className)}>
      <div
        className="relative mx-auto max-h-[100dvh] bg-black"
        style={{
          aspectRatio: '9 / 16',
          width: 'min(100vw, calc(100dvh * 9 / 16))',
        }}
      >
        <video
          ref={videoRef as LegacyRef<HTMLVideoElement>}
          autoPlay
          playsInline
          muted
          className={cn('absolute inset-0 h-full w-full', videoClass)}
        />
      </div>
    </div>
  );
}
