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
 * Full-bleed preview: fills the viewport layer (`inset-0`) with **`object-cover`**
 * so the stream matches the phone screen edge-to-edge (like `background-size: cover`).
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  return (
    <video
      ref={videoRef as LegacyRef<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className={cn(
        'absolute inset-0 h-full w-full bg-black object-cover object-center',
        mirror && '-scale-x-100',
        className
      )}
    />
  );
}
