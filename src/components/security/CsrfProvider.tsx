'use client';

import { useEffect } from 'react';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

let csrfInflight: Promise<void> | null = null;

function ensureCsrfCookie(): Promise<void> {
  if (readCsrfCookie()) return Promise.resolve();
  if (!csrfInflight) {
    csrfInflight = fetch('/api/csrf', { credentials: 'same-origin' })
      .then(() => undefined)
      .finally(() => {
        csrfInflight = null;
      });
  }
  return csrfInflight;
}

/**
 * Patches global fetch so relative `/api/*` mutations send `x-csrf-token` matching the CSRF cookie.
 * (Most app calls use string URLs; full-URL fetches to our origin still need credentials + cookie.)
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const orig = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const method = (init?.method ?? 'GET').toUpperCase();
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        if (isMutation && !input.startsWith('/api/csrf')) {
          await ensureCsrfCookie();
          const token = readCsrfCookie();
          const headers = new Headers(init?.headers);
          if (token) {
            headers.set(CSRF_HEADER_NAME, token);
          }
          return orig(input, {
            ...init,
            headers,
            credentials: init?.credentials ?? 'same-origin',
          });
        }
      }
      return orig(input, init);
    };

    return () => {
      window.fetch = orig;
    };
  }, []);

  return <>{children}</>;
}
