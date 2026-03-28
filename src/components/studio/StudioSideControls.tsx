'use client';

import {
  IconArrowPath,
  IconBolt,
  IconClock,
  IconLayoutGrid,
  IconRadio,
  IconSparkles,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioSideControlsProps = {
  canFlip: boolean;
  onFlip: () => void;
  gridOn: boolean;
  onToggleGrid: () => void;
  className?: string;
};

export default function StudioSideControls({
  canFlip,
  onFlip,
  gridOn,
  onToggleGrid,
  className,
}: StudioSideControlsProps) {
  return (
    <div
      className={cn(
        'absolute right-4 top-28 z-20 flex flex-col items-center gap-4',
        className
      )}
    >
      <button
        type="button"
        onClick={() => void onFlip()}
        disabled={!canFlip}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm disabled:opacity-35"
        aria-label="Flip camera"
      >
        <IconArrowPath className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled
        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm opacity-45"
        aria-label="Flash"
        title="Coming soon"
      >
        <IconBolt className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled
        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm opacity-45"
        aria-label="Timer"
        title="Coming soon"
      >
        <IconClock className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleGrid}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm',
          gridOn && 'ring-1 ring-white/35'
        )}
        aria-label="Grid guide"
        aria-pressed={gridOn}
      >
        <IconLayoutGrid className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled
        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm opacity-45"
        aria-label="Effects"
        title="Coming soon"
      >
        <IconSparkles className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-transparent text-white/35"
        aria-label="Live"
        title="Coming soon"
      >
        <IconRadio className="h-5 w-5" />
      </button>
    </div>
  );
}
