'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { BETALENT_TOAST_EVENT, type BetalentToastDetail } from '@/lib/betalent-toast';

type ActiveToast = BetalentToastDetail & { id: number };

/**
 * Fixed snackbar for upload/feed handoff and other global messages.
 */
export default function GlobalAppToastHost() {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const seq = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    const onToast = (ev: Event) => {
      const e = ev as CustomEvent<BetalentToastDetail>;
      const d = e.detail;
      if (!d?.message) return;
      if (clearTimer.current) clearTimeout(clearTimer.current);
      const id = ++seq.current;
      const durationMs = d.durationMs ?? 4000;
      setToast({ ...d, id });
      if (durationMs > 0) {
        clearTimer.current = setTimeout(() => {
          setToast((t) => (t?.id === id ? null : t));
        }, durationMs);
      }
    };
    window.addEventListener(BETALENT_TOAST_EVENT, onToast as EventListener);
    return () => window.removeEventListener(BETALENT_TOAST_EVENT, onToast as EventListener);
  }, []);

  if (!toast) return null;

  const isError = toast.variant === 'error';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[300] flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))' }}
      role="status"
    >
      <div
        className={
          'pointer-events-auto flex max-w-lg flex-col gap-2 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md ' +
          (isError
            ? 'border-red-500/35 bg-red-950/90 text-red-100'
            : 'border-white/[0.12] bg-[#141416]/95 text-white/95')
        }
      >
        <p className="text-[14px] leading-snug font-medium">{toast.message}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="text-[12px] font-semibold text-white/50 hover:text-white/80"
          >
            Dismiss
          </button>
          {toast.actionLabel ? (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                dismiss();
              }}
              className="min-h-[40px] rounded-xl bg-accent px-4 text-[13px] font-semibold text-white"
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
