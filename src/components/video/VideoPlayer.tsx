'use client';

import { useRef, useEffect } from 'react';
import { useQualifiedViewTracking } from '@/hooks/useQualifiedViewTracking';

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  durationSec: number;
}

export default function VideoPlayer({ videoId, videoUrl, thumbnailUrl, title, durationSec }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useQualifiedViewTracking({
    videoId,
    durationSec: Math.max(1, durationSec),
    enabled: true,
    videoRef,
    containerRef,
    source: 'detail',
    mediaKey: videoUrl,
  });

  return (
    <div ref={containerRef} className="relative w-full aspect-video max-h-[70vh] bg-black rounded-[20px] overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
