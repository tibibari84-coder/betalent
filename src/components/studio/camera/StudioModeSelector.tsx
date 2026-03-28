'use client';

import { cn } from '@/lib/utils';

export type StudioModeSelectorProps = {
  /** Platform / challenge upload cap — options are filtered to not exceed this. */
  platformMaxSec: number;
  value: number;
  onChange: (sec: number) => void;
  disabled?: boolean;
  showLiveSoon?: boolean;
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
  showLiveSoon = true,
  className,
}: StudioModeSelectorProps) {
  const opts = durationOptions(platformMaxSec);
  return (
    <div
      className={cn(
        'flex snap-x snap-mandatory justify-center gap-2 overflow-x-auto px-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
              'snap-center shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold tabular-nums transition-transform active:scale-[0.96]',
              active
                ? 'bg-white/[0.2] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)]'
                : 'bg-white/[0.06] text-white/42',
              disabled && 'pointer-events-none opacity-35'
            )}
          >
            {label}
          </button>
        );
      })}
      {showLiveSoon ? (
        <span
          className="snap-center shrink-0 rounded-full border border-white/[0.08] px-3 py-2 text-[11px] font-bold tabular-nums uppercase tracking-[0.14em] text-white/28"
          title="Coming soon"
        >
          Live
        </span>
      ) : null}
    </div>
  );
}
