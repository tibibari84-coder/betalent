'use client';

import { IconArrowPath, IconClock, IconSparkles, IconStar } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioSideControlsProps = {
  canFlip: boolean;
  onFlip: () => void;
  className?: string;
};

const circleBtn =
  'touch-manipulation flex h-[48px] w-[48px] items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors';

const iconClass = 'h-[22px] w-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]';

/** Right rail: Flip · Timer · Filters · Enhance (luxury dark glass). */
export default function StudioSideControls({ canFlip, onFlip, className }: StudioSideControlsProps) {
  return (
    <div
      className={cn(
        'absolute right-3 z-20 flex flex-col items-center gap-3',
        'top-[calc(4.5rem+env(safe-area-inset-top))]',
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
        <IconArrowPath className={iconClass} />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Timer"
        title="Coming soon"
      >
        <IconClock className={iconClass} />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Filters"
        title="Coming soon"
      >
        <IconSparkles className={iconClass} />
      </button>
      <button
        type="button"
        disabled
        className={cn(circleBtn, 'opacity-45')}
        aria-label="Enhance"
        title="Coming soon"
      >
        <IconStar className={iconClass} />
      </button>
    </div>
  );
}
