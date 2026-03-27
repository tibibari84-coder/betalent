'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'betalent_first_session_seen';

export function FirstSessionBanner({ compact = false }: { compact?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const welcome = params.get('welcome') === '1';
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (welcome && !seen) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, '1');
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.toString());
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between rounded-xl',
        compact ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(196,18,47,0.12) 0%, rgba(196,18,47,0.04) 100%)',
        border: '1px solid rgba(196,18,47,0.25)',
      }}
      role="status"
    >
      <div className="min-w-0">
        <p className={cn('font-medium text-white', compact ? 'text-[13px]' : 'text-[14px]')}>
          Get started
        </p>
        <p
          className={cn(
            'text-white/70',
            compact ? 'text-[12px] mt-0.5 leading-snug' : 'text-[13px] mt-0.5'
          )}
        >
          {compact ? 'Upload · Explore · Challenges' : 'Upload a performance · Explore talent · Join a challenge'}
        </p>
      </div>
      <div className={cn('flex items-center flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
        <Link
          href="/upload"
          className={cn(
            'rounded-lg font-semibold text-white bg-accent hover:bg-accent-hover transition-colors',
            compact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
          )}
        >
          Upload
        </Link>
        <Link
          href="/explore"
          className={cn(
            'rounded-lg font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors',
            compact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
          )}
        >
          Explore
        </Link>
        <Link
          href="/challenges"
          className={cn(
            'rounded-lg font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors',
            compact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
          )}
        >
          Challenges
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
