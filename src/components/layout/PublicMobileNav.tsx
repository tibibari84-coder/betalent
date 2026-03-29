'use client';

import type { ComponentType } from 'react';

/**
 * Guest bottom navigation — discovery and auth only.
 * No upload, inbox, wallet, or profile shortcuts (authenticated MobileNav only).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isMobileOrTabletDevice } from '@/lib/device';

const IconHome = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const IconSearch = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const IconLogin = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);
const IconUserPlus = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0115 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 8.25v4.5m2.25-2.25h-4.5" />
  </svg>
);
const IconTrophy = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 01-3 3h-3a3 3 0 01-3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-3.75c-.621 0-1.125.504-1.125 1.125V18.75M9 5.25v3.75m6-3.75v3.75m-9 0h12" />
  </svg>
);

const ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: '/landing', label: 'Home', icon: IconHome },
  { href: '/explore', label: 'Explore', icon: IconSearch },
  { href: '/register', label: 'Join', icon: IconUserPlus },
  { href: '/login', label: 'Sign in', icon: IconLogin },
  { href: '/challenges', label: 'Challenges', icon: IconTrophy },
];

function isActive(pathname: string | null, href: string): boolean {
  if (pathname == null) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function PublicMobileNav() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isMobileOrTabletDevice());
  }, []);

  if (!enabled) return null;

  return (
    <nav
      role="navigation"
      aria-label="Public navigation"
      className="
        fixed bottom-0 left-0 right-0 z-50
        min-h-[var(--bottom-nav-height)]
        pt-2 pb-[max(8px,env(safe-area-inset-bottom))]
        px-1
        border-t border-white/5
      "
      style={{
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 min-w-0 min-h-[52px] touch-manipulation
                transition-colors duration-200
                ${active ? 'text-accent' : 'text-text-muted hover:text-text-secondary active:text-accent'}
              `}
              style={{ minWidth: 52 }}
            >
              <span className={active ? 'drop-shadow-[0_0_8px_rgba(196,18,47,0.4)]' : ''}>
                <Icon className="w-6 h-6" />
              </span>
              <span className={`text-[11px] font-medium truncate max-w-full px-0.5 ${active ? 'text-accent' : 'text-inherit'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
