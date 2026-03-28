'use client';

import { IconMic2, IconX } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export type StudioTopBarProps = {
  onClose: () => void;
  onAddSound?: () => void;
  className?: string;
};

export default function StudioTopBar({ onClose, onAddSound, className }: StudioTopBarProps) {
  return (
    <header
      className={cn(
        'pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))] pb-3',
        className
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-sm"
        aria-label="Close studio"
      >
        <IconX className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={onAddSound ?? (() => {})}
        className="inline-flex items-center gap-2 rounded-full bg-black/35 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
        aria-label="Add sound"
      >
        <IconMic2 className="h-5 w-5 opacity-90" aria-hidden />
        Add sound
      </button>
      <div className="h-12 w-12 shrink-0" aria-hidden />
    </header>
  );
}
