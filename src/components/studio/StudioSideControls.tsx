'use client';

import {
  IconArrowPath,
  IconBolt,
  IconClock,
  IconLayoutGrid,
  IconSparkles,
  IconTrendingUp,
  IconChevronDown,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioSideControlsProps = {
  canFlip: boolean;
  onFlip: () => void;
  gridOn: boolean;
  onToggleGrid: () => void;
  className?: string;
};

const circleBtn =
  'flex h-[48px] w-[48px] items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors';

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
        'absolute right-3 z-20 flex flex-col items-center gap-3',
        'top-[calc(5.25rem+env(safe-area-inset-top))]',
        className
      )}
    >
      <button
        type="button"
        onClick={() => void onFlip()}
        disabled={!canFlip}
        className={cn(circleBtn, 'disabled:opacity-35')}
        aria-label="Flip camera"
      >
        <IconArrowPath className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Flash"
        title="Coming soon"
      >
        <IconBolt className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Speed"
        title="Coming soon"
      >
        <IconTrendingUp className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Timer"
        title="Coming soon"
      >
        <IconClock className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        onClick={onToggleGrid}
        className={cn(
          circleBtn,
          gridOn && 'border-red-500/55 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
        )}
        aria-label="Grid guide"
        aria-pressed={gridOn}
      >
        <IconLayoutGrid className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Filters"
        title="Coming soon"
      >
        <IconSparkles className="h-[22px] w-[22px]" />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'border-white/15 opacity-40')}
        aria-label="More"
        title="Coming soon"
      >
        <IconChevronDown className="h-[22px] w-[22px]" />
      </button>
    </div>
  );
}
