'use client';

import { cn } from '@/lib/utils';

export type StudioModeSelectorProps = {
  platformMaxSec: number;
  value: number;
  onChange: (sec: number) => void;
  disabled?: boolean;
  className?: string;
};

/** Longest slot: up to 10m when platform allows; label matches real cap (no fake 10m when max is 90s). */
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
  const recordingSlots: { sec: number; label: string }[] = [
    { sec: long, label: formatLongLabel(long) },
    { sec: 60, label: '60s' },
    { sec: 15, label: '15s' },
  ].filter((slot) => slot.sec <= platformMaxSec && slot.sec >= 1);

  const uniq = recordingSlots.filter(
    (slot, i, arr) => arr.findIndex((s) => s.sec === slot.sec) === i
  );

  return (
    <div
      className={cn(
        'flex w-full max-w-[min(100%,24rem)] flex-col gap-2 px-3',
        className
      )}
      role="group"
      aria-label="Recording mode"
    >
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {uniq.map((slot) => {
          const active = slot.sec === value;
          return (
            <button
              key={`rec-${slot.sec}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot.sec)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold transition-transform active:scale-[0.98]',
                active ? 'bg-white text-black' : 'bg-transparent text-white',
                disabled && 'pointer-events-none opacity-35'
              )}
            >
              {slot.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled
          className="shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold text-white/45 opacity-50"
          title="Coming soon"
        >
          PHOTO
        </button>
        <button
          type="button"
          disabled
          className="shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold text-white/45 opacity-50"
          title="Coming soon"
        >
          TEXT
        </button>
        <button
          type="button"
          disabled
          className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold uppercase tracking-wide text-white/35 opacity-50"
          title="Coming soon"
        >
          LIVE
        </button>
      </div>
    </div>
  );
}
