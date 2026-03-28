'use client';

/**
 * Detect iframe embedding and Permissions-Policy / document-level getUserMedia blocks
 * (distinct from per-site permission prompts).
 */

export function isLikelyEmbeddedInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent: cannot compare; treat as embedded.
    return true;
  }
}

/** Chrome: "Permissions policy violation: camera is not allowed in this document" */
export function isPermissionsPolicyMediaError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? '').toLowerCase();
  const name = (e as DOMException)?.name ?? '';
  if (name !== 'NotAllowedError' && name !== 'SecurityError') return false;
  return (
    msg.includes('permissions policy') ||
    msg.includes('permission policy') ||
    msg.includes('not allowed in this document') ||
    msg.includes('disabled by permissions policy')
  );
}

export function cameraEnvironmentBlockedMessage(embedded: boolean): string {
  if (embedded) {
    return 'Camera and microphone are not allowed in this embedded view. Open BeTalent in a full tab (not inside another site’s frame). If this page is embedded on purpose, the parent page must use an iframe with allow="camera; microphone".';
  }
  return 'Camera access is blocked by this page’s security policy (Permissions-Policy), not by your browser prompt. Try reloading after an update, or contact support if this persists.';
}
