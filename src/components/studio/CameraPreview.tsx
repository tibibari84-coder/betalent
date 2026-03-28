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
 * Natural preview: **`object-contain`** — full camera frame visible, **no crop, no “zoomed in” look**
 * (`object-cover` was perceived as constant zoom). Letterboxing only if sensor vs screen aspect differs.
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  return (
    <video
      ref={videoRef as LegacyRef<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className={cn(
        'absolute inset-0 h-full w-full bg-black object-contain object-center',
        mirror && '-scale-x-100',
        className
      )}
    />
  );
}
