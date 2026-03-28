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
 * Full-viewport portrait preview: fills the frame (no floating box / letterbox bands).
 * Selfie bias keeps face + upper torso in frame without stretching.
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  return (
    <video
      ref={videoRef as LegacyRef<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className={cn(
        'absolute inset-0 h-full w-full bg-black object-cover object-[center_30%]',
        mirror && '-scale-x-100',
        className
      )}
    />
  );
}
