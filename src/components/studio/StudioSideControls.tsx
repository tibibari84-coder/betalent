'use client';

import { IconArrowPath } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioSideControlsProps = {
  canFlip: boolean;
  onFlip: () => void;
  className?: string;
};

const circleBtn =
  'touch-manipulation flex h-[48px] w-[48px] items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors';

const iconClass = 'h-[22px] w-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]';

/** Flip camera only — no placeholder controls. */
export default function StudioSideControls({ canFlip, onFlip, className }: StudioSideControlsProps) {
  return (
    <div
      className={cn(
        'absolute right-3 z-20 flex flex-col items-center',
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
    </div>
  );
}
