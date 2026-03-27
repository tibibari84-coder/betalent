'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export type CommentActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function CommentMobileActionSheet({
  open,
  title,
  subtitle,
  actions,
  onClose,
}: {
  open: boolean;
  title?: string;
  /** Premium context line under title (e.g. interaction hints). */
  subtitle?: string;
  actions: CommentActionItem[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col justify-end md:items-center md:justify-center md:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-[22px] md:rounded-[22px] border border-white/[0.1] shadow-[0_-12px_48px_rgba(0,0,0,0.55)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{
          background: 'linear-gradient(180deg, rgba(22,22,28,0.98) 0%, rgba(12,12,16,0.99) 100%)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="px-5 pt-4 pb-2 text-center">
            <p className="text-[13px] font-semibold tracking-wide text-white/80">{title}</p>
            {subtitle ? <p className="mt-1 text-[11px] leading-relaxed text-white/40">{subtitle}</p> : null}
          </div>
        ) : null}
        <ul className="py-1">
          {actions.map((a, i) => {
            const prev = actions[i - 1];
            const showSep = a.danger && prev && !prev.danger;
            return (
              <li key={a.id}>
                {showSep ? <div className="mx-4 my-1 h-px bg-white/[0.08]" aria-hidden /> : null}
                <button
                  type="button"
                  disabled={a.disabled}
                  onClick={() => {
                    if (!a.disabled) {
                      a.onClick();
                      onClose();
                    }
                  }}
                  className={`w-full min-h-[52px] px-5 text-left text-[16px] font-medium transition-colors disabled:opacity-40 ${
                    a.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {a.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-white/[0.08] px-2 pt-1 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl text-[16px] font-semibold text-white/80 hover:bg-white/[0.06]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
