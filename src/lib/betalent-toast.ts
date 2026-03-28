/** Dispatched on `window`; consumed by {@link GlobalAppToastHost}. */

export const BETALENT_TOAST_EVENT = 'betalent-app-toast';

export type BetalentToastDetail = {
  message: string;
  /** Default ~4s; 0 = sticky until dismissed */
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'error';
};

export function showBetalentToast(detail: BetalentToastDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BetalentToastDetail>(BETALENT_TOAST_EVENT, { detail }));
}
