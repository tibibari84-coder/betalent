'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
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
const IconUpload = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconInbox = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.424l.256 1.912a2.25 2.25 0 002.013 1.424h3.218a2.25 2.25 0 002.013-1.424l.256-1.912a2.25 2.25 0 012.013-1.424h3.86m-19.5 0V2.25m0 13.5V19.5m0-13.5h-3.86a2.25 2.25 0 00-2.013 1.424l-.256 1.912a2.25 2.25 0 01-2.013 1.424H2.25" />
  </svg>
);
const IconProfile = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ITEMS: { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; isUpload?: boolean }[] = [
  { href: '/feed', labelKey: 'nav.home', icon: IconHome },
  { href: '/explore', labelKey: 'nav.search', icon: IconSearch },
  { href: '/upload', labelKey: 'nav.upload', icon: IconUpload, isUpload: true },
  { href: '/inbox', labelKey: 'nav.inbox', icon: IconInbox },
  { href: '/profile/me', labelKey: 'nav.profile', icon: IconProfile },
];

function isActive(pathname: string | null, href: string): boolean {
  if (pathname == null) return false;
  if (href === '/profile/me') return pathname === '/profile/me' || pathname.startsWith('/profile/');
  if (href === '/feed') return pathname === '/feed' || pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isMobileOrTabletDevice());
  }, []);

  if (!enabled) return null;

  return (
    <nav
      role="navigation"
      aria-label="Mobile navigation"
      className="
        fixed bottom-0 left-0 right-0 z-50
        min-h-[var(--bottom-nav-height)]
        pt-3 pb-[max(8px,env(safe-area-inset-bottom))]
        px-1
        rounded-t-[20px]
        border-t border-[rgba(255,255,255,0.06)]
      "
      style={{
        background: 'rgba(8,8,10,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.28), 0 -1px 0 rgba(255,255,255,0.03) inset',
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {ITEMS.map(({ href, labelKey, icon: Icon, isUpload }) => {
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
                ${isUpload && active ? 'relative' : ''}
              `}
              style={{ minWidth: 52 }}
            >
              {isUpload ? (
                <span
                  className={`
                    flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200
                    ${active ? 'bg-accent/20 text-accent shadow-[0_0_20px_rgba(196,18,47,0.25)]' : 'bg-white/[0.06] text-text-muted'}
                  `}
                >
                  <Icon className="w-6 h-6" />
                </span>
              ) : (
                <span className={active ? 'drop-shadow-[0_0_8px_rgba(196,18,47,0.4)]' : ''}>
                  <Icon className="w-6 h-6" />
                </span>
              )}
              <span
                className={`
                  text-[11px] font-medium truncate max-w-full px-0.5
                  ${active ? 'text-accent' : 'text-inherit'}
                `}
              >
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
