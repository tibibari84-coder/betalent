'use client';

/**
 * Topbar shell: max-width matches RootShell; padding via --topbar-pad-x (16/20/24/32px).
 * Desktop grid: 260px | centered search (≤520px) | 280px — trophy, bell, chat, avatar.
 */

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconUser, IconTrophy, IconMenu } from '@/components/ui/Icons';
import NotificationsBell from '@/components/notifications/NotificationsBell';
import { ChatNavButton } from '@/components/chat/ChatNavButton';
import { APP_NAME } from '@/constants/app';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { BrandMarkLockupNav } from '@/components/brand/BrandMarkLockup';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

type NavUser = { username: string; avatarUrl?: string | null };

const TOPBAR_TRANSITION = 'transition-all duration-150 ease-out';
const ICON_BTN =
  'inline-flex items-center justify-center shrink-0 h-9 w-9 min-h-9 min-w-9 rounded-[10px] text-white/80 hover:text-white/95 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98] ' +
  TOPBAR_TRANSITION +
  ' focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const HAMBURGER_BTN =
  'flex items-center justify-center shrink-0 h-9 w-9 -ml-1 rounded-[10px] text-white/80 hover:text-white hover:bg-white/[0.06] ' +
  TOPBAR_TRANSITION +
  ' focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10';
const UTIL_ROW = 'flex items-center justify-end gap-[10px] shrink-0 min-w-0';
const AVATAR_RING =
  'flex items-center justify-center overflow-hidden shrink-0 rounded-full bg-white/10 ring-1 ring-white/10 ' +
  TOPBAR_TRANSITION +
  ' group-hover:ring-white/20';
const SEARCH_BOX = cn(
  'relative w-full h-[38px] rounded-[10px] overflow-hidden bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]',
  TOPBAR_TRANSITION
);

function TopbarSearchForm({
  maxClass,
  placeholder,
  onSubmit,
}: {
  maxClass: string;
  placeholder: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={onSubmit} role="search" className={cn('group mx-auto w-full min-w-0', maxClass, TOPBAR_TRANSITION)}>
      <div
        className={cn(SEARCH_BOX, focused && 'border-white/[0.08] bg-white/[0.05]')}
        style={{
          boxShadow: focused
            ? '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.04)'
            : 'inset 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]"
          aria-hidden
        />
        <input
          name="q"
          type="search"
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus:ring-0 focus-visible:outline-none"
        />
      </div>
    </form>
  );
}

export default function Navbar({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<NavUser | null | 'loading'>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isImmersiveFeedRoute = pathname === '/feed';
  const isSettingsRoute = pathname === '/settings' || (pathname?.startsWith('/settings/') ?? false);
  const hideGlobalRightPanel = isImmersiveFeedRoute || isSettingsRoute;

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user?.username) {
          setUser({ username: data.user.username, avatarUrl: data.user.avatarUrl ?? null });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements.namedItem('q');
    const q = el && 'value' in el ? String(el.value).trim() : '';
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/explore');
    }
  }

  const profileMenu =
    user && user !== 'loading' ? (
      <div className="relative flex shrink-0 items-center" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((o) => !o)} className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')} aria-expanded={menuOpen}>
          <span
            className={cn(
              AVATAR_RING,
              'w-[var(--avatar-topbar)] h-[var(--avatar-topbar)] min-w-[var(--avatar-topbar)] min-h-[var(--avatar-topbar)]'
            )}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
            ) : (
              <IconUser className="w-[18px] h-[18px] shrink-0" />
            )}
          </span>
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 py-1.5 min-w-[172px] rounded-xl overflow-hidden z-[100]"
            style={{ background: 'rgba(18,18,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            <Link href="/profile/me" className={cn('block px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-white/[0.08]', TOPBAR_TRANSITION)} onClick={() => setMenuOpen(false)}>
              {t('topbar.profile')}
            </Link>
            <Link href="/settings" className={cn('block px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/[0.08]', TOPBAR_TRANSITION)} onClick={() => setMenuOpen(false)}>
              Settings
            </Link>
            <button type="button" onClick={handleSignOut} className={cn('w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/[0.08] border-t border-white/5', TOPBAR_TRANSITION)}>
              Sign out
            </button>
          </div>
        )}
      </div>
    ) : null;

  const loginOrLoading = (
    <>
      {user === 'loading' && (
        <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
          <IconUser className="w-[18px] h-[18px] shrink-0" />
        </span>
      )}
      {user === null && (
        <Link href="/login" className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')}>
          <span
            className={cn(
              AVATAR_RING,
              'w-[var(--avatar-topbar)] h-[var(--avatar-topbar)] min-w-[var(--avatar-topbar)] min-h-[var(--avatar-topbar)]'
            )}
          >
            <IconUser className="w-[18px] h-[18px] shrink-0" />
          </span>
        </Link>
      )}
    </>
  );

  const utilities = (
    <>
      <Link href="/trending" className={ICON_BTN} aria-label={t('topbar.challenges')}>
        <IconTrophy className="w-[18px] h-[18px] shrink-0" />
      </Link>
      <div className="flex shrink-0 items-center justify-center [&_*]:min-w-0">
        <NotificationsBell />
      </div>
      {user && user !== 'loading' ? <ChatNavButton /> : null}
      {profileMenu}
      {loginOrLoading}
    </>
  );

  return (
    <header
      role="banner"
      className={cn('sticky top-0 z-50 w-full', TOPBAR_TRANSITION)}
      style={{
        background: scrolled ? 'rgba(20, 20, 24, 0.82)' : 'rgba(20, 20, 24, 0.78)',
        backdropFilter: scrolled ? 'blur(18px)' : 'blur(16px)',
        WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset',
      }}
    >
      <div
        className="mx-auto w-full min-w-0 max-w-[var(--shell-max-width)]"
        style={{
          paddingLeft: 'var(--topbar-pad-x)',
          paddingRight: 'var(--topbar-pad-x)',
        }}
      >
        {/* Mobile / tablet: three columns */}
        <div
          className={cn(
            'grid h-[var(--topbar-height)] w-full min-w-0 items-center gap-x-2 sm:gap-x-3',
            'grid-cols-[auto_minmax(0,1fr)_auto]',
            'lg:hidden'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {onOpenDrawer && (
              <button type="button" onClick={onOpenDrawer} className={HAMBURGER_BTN} aria-label="Open menu">
                <IconMenu className="w-5 h-5 shrink-0" />
              </button>
            )}
            <Link
              href="/"
              aria-label={APP_NAME}
              className={cn(
                'group min-w-0 rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                TOPBAR_TRANSITION
              )}
            >
              <BrandMarkLockupNav>
                <BrandWordmark variant="nav" className="truncate" />
              </BrandMarkLockupNav>
            </Link>
          </div>
          <div className="hidden min-w-0 justify-center px-1 sm:flex sm:px-2">
            <TopbarSearchForm maxClass="max-w-[min(100%,420px)]" placeholder={t('topbar.searchPlaceholder')} onSubmit={handleSearchSubmit} />
          </div>
          <div className={UTIL_ROW}>
            <Link href="/explore" className={cn(ICON_BTN, 'sm:hidden')} aria-label={t('topbar.searchPlaceholder')}>
              <IconSearch className="w-[18px] h-[18px] shrink-0" />
            </Link>
            {utilities}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden h-[var(--topbar-height)] w-full min-w-0 lg:block">
          {hideGlobalRightPanel ? (
            <div className="flex h-full w-full min-w-0 items-center gap-6 desktop:gap-8">
              <div className="flex w-[260px] min-w-[260px] shrink-0 items-center">
                <Link
                  href="/"
                  aria-label={APP_NAME}
                  className={cn(
                    'group min-w-0 rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    TOPBAR_TRANSITION
                  )}
                >
                  <BrandMarkLockupNav>
                    <BrandWordmark variant="nav" />
                  </BrandMarkLockupNav>
                </Link>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-6">
                <div className="flex min-w-0 flex-1 justify-center px-2">
                  <TopbarSearchForm maxClass="max-w-[min(100%,520px)]" placeholder={t('topbar.searchPlaceholder')} onSubmit={handleSearchSubmit} />
                </div>
                <div className={UTIL_ROW}>{utilities}</div>
              </div>
            </div>
          ) : (
            <div className="grid h-full w-full min-w-0 grid-cols-[260px_minmax(0,1fr)_280px] items-center gap-6 desktop:gap-8">
              <div className="flex min-w-0 items-center">
                <Link
                  href="/"
                  aria-label={APP_NAME}
                  className={cn(
                    'group min-w-0 rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    TOPBAR_TRANSITION
                  )}
                >
                  <BrandMarkLockupNav>
                    <BrandWordmark variant="nav" />
                  </BrandMarkLockupNav>
                </Link>
              </div>
              <div className="flex min-w-0 justify-center px-2">
                <TopbarSearchForm maxClass="max-w-[min(100%,520px)]" placeholder={t('topbar.searchPlaceholder')} onSubmit={handleSearchSubmit} />
              </div>
              <div className={UTIL_ROW}>{utilities}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
