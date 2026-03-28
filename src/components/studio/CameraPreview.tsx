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
 * Full-bleed portrait preview: fills the studio layer edge-to-edge (TikTok-style).
 * Uses `object-cover` so the stream fills the frame without letterboxing; `object-center` keeps framing neutral
 * (no CSS transform zoom — only fit/crop to viewport like native camera apps).
 */
export default function CameraPreview({ videoRef, mirror, className }: CameraPreviewProps) {
  return (
    <video
      ref={videoRef as LegacyRef<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className={cn(
        'absolute inset-0 h-full w-full min-h-full min-w-full bg-black object-cover object-center',
        mirror && '-scale-x-100',
        className
      )}
    />
  );
}
