'use client';

import type { LegacyRef, RefObject } from 'react';
import { cn } from '@/lib/utils';

export type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Front camera: mirror for natural selfie UX. */
  mirror?: boolean;
  className?: string;
};

/**
 * Natural preview: `object-contain` — no face crop / fake zoom from `object-cover`.
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  return (
    <video
      ref={videoRef as LegacyRef<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className={cn(
        'absolute inset-0 h-full w-full bg-black object-contain',
        mirror && '-scale-x-100',
        className
      )}
    />
  );
}
