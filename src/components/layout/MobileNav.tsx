'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Home, MessageSquare, PlusSquare, Search, User } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useCompactNavChrome } from '@/hooks/useCompactNavChrome';
import { cn } from '@/lib/utils';

const ICON_STROKE = 1.5;

const ITEMS: {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  isUpload?: boolean;
}[] = [
  { href: '/feed', labelKey: 'nav.home', icon: Home },
  { href: '/explore', labelKey: 'nav.search', icon: Search },
  { href: '/upload', labelKey: 'nav.upload', icon: PlusSquare, isUpload: true },
  { href: '/inbox', labelKey: 'nav.inbox', icon: MessageSquare },
  { href: '/profile/me', labelKey: 'nav.profile', icon: User },
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
  const enabled = useCompactNavChrome();

  if (!enabled) return null;

  return (
    <nav
      role="navigation"
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 min-h-[var(--bottom-nav-height)] border-t border-white/5 bg-black/80 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_8px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      style={{ WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {ITEMS.map(({ href, labelKey, icon: Icon, isUpload }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 touch-manipulation transition-all duration-150 ease-out',
                active ? 'text-[#E31B23]' : 'text-gray-500 hover:text-gray-300'
              )}
              style={{ minWidth: 52 }}
            >
              {isUpload ? (
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-150 ease-out',
                    active
                      ? 'bg-[#E31B23]/20 text-[#E31B23] shadow-[0_0_12px_rgba(227,27,35,0.35)]'
                      : 'bg-white/[0.06] text-current'
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={ICON_STROKE} />
                </span>
              ) : (
                <span className={cn(active && 'drop-shadow-[0_0_8px_rgba(227,27,35,0.6)]')}>
                  <Icon className="h-6 w-6" strokeWidth={ICON_STROKE} />
                </span>
              )}
              <span
                className={cn(
                  'max-w-full truncate px-0.5 text-[11px] transition-all duration-150 ease-out',
                  active ? 'font-semibold' : 'font-medium'
                )}
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
