'use client';

import { cn } from '@/lib/utils';

export type StudioModeSelectorProps = {
  platformMaxSec: number;
  value: number;
  onChange: (sec: number) => void;
  disabled?: boolean;
  className?: string;
};

function durationOptions(platformMaxSec: number): number[] {
  const base = [15, 60, 90].filter((s) => s <= platformMaxSec);
  if (!base.includes(platformMaxSec)) base.push(platformMaxSec);
  return Array.from(new Set(base)).sort((a, b) => a - b);
}

export default function StudioModeSelector({
  platformMaxSec,
  value,
  onChange,
  disabled,
  className,
}: StudioModeSelectorProps) {
  const opts = durationOptions(platformMaxSec);
  return (
    <div
      className={cn(
        'absolute bottom-40 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3',
        className
      )}
      role="group"
      aria-label="Recording length"
    >
      {opts.map((sec) => {
        const label = sec >= 600 ? `${Math.round(sec / 60)}m` : `${sec}s`;
        const active = sec === value;
        return (
          <button
            key={sec}
            type="button"
            disabled={disabled}
            onClick={() => onChange(sec)}
            className={cn(
              'rounded-full px-5 py-2 text-lg font-semibold transition-transform active:scale-[0.98]',
              active ? 'bg-white text-black' : 'bg-black/30 text-white/85',
              disabled && 'pointer-events-none opacity-35'
            )}
          >
            {label}
          </button>
        );
      })}
      <span
        className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/45"
        title="Coming soon"
      >
        LIVE
      </span>
    </div>
  );
}
