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
        'pointer-events-auto absolute inset-x-0 top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 pt-[max(10px,env(safe-area-inset-top))] pb-3',
        className
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center justify-self-start rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"
        aria-label="Close studio"
      >
        <IconX className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={onAddSound ?? (() => {})}
        className="inline-flex max-w-[min(100%,14rem)] touch-manipulation items-center justify-center gap-2 rounded-full border border-white/12 bg-black/40 px-5 py-2.5 text-[14px] font-semibold text-white backdrop-blur-md"
        aria-label="Add sound"
      >
        <IconMic2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">Add sound</span>
      </button>
      <span className="justify-self-end" aria-hidden />
    </header>
  );
}
