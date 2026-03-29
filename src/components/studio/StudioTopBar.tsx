'use client';

import { IconX } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioTopBarProps = {
  onClose: () => void;
  className?: string;
};

/** Minimal studio chrome: close only (no placeholder actions). */
export default function StudioTopBar({ onClose, className }: StudioTopBarProps) {
  return (
    <header
      className={cn(
        'pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-3',
        className
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"
        aria-label="Close studio"
      >
        <IconX className="h-6 w-6" />
      </button>
    </header>
  );
}
