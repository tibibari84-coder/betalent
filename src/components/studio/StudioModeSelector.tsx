'use client';

import { cn } from '@/lib/utils';

export type StudioModeSelectorProps = {
  platformMaxSec: number;
  value: number;
  onChange: (sec: number) => void;
  disabled?: boolean;
  className?: string;
};

/** Longest slot: up to 10m when platform allows. */
function longCapSec(platformMaxSec: number): number {
  return Math.min(600, platformMaxSec);
}

function formatLongLabel(sec: number): string {
  if (sec >= 600) return '10m';
  if (sec >= 60 && sec % 60 === 0) return `${sec / 60}m`;
  return `${sec}s`;
}

export default function StudioModeSelector({
  platformMaxSec,
  value,
  onChange,
  disabled,
  className,
}: StudioModeSelectorProps) {
  const long = longCapSec(platformMaxSec);
  const durationSlots: { sec: number; label: string }[] = [];
  if (15 <= platformMaxSec) durationSlots.push({ sec: 15, label: '15s' });
  if (60 <= platformMaxSec) durationSlots.push({ sec: 60, label: '60s' });
  if (long >= 1 && long !== 15 && long !== 60 && long <= platformMaxSec) {
    durationSlots.push({ sec: long, label: formatLongLabel(long) });
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-[min(100%,22rem)] flex-col gap-2 px-2',
        className
      )}
      role="group"
      aria-label="Recording mode"
    >
      <div
        className={cn(
          'flex snap-x snap-mandatory items-center justify-start gap-2 overflow-x-auto pb-1',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
      >
        <button
          type="button"
          disabled
          className="snap-center shrink-0 touch-manipulation rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[15px] font-semibold text-white/40"
          title="Coming soon"
        >
          Text
        </button>
        <button
          type="button"
          disabled
          className="snap-center shrink-0 touch-manipulation rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[15px] font-semibold text-white/40"
          title="Coming soon"
        >
          Photo
        </button>
        {durationSlots.map((slot) => {
          const active = slot.sec === value;
          return (
            <button
              key={`rec-${slot.sec}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot.sec)}
              className={cn(
                'snap-center shrink-0 touch-manipulation rounded-full px-4 py-2 text-[15px] font-semibold transition-transform active:scale-[0.98]',
                active ? 'bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.12)]' : 'bg-transparent text-white',
                disabled && 'pointer-events-none opacity-35'
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
