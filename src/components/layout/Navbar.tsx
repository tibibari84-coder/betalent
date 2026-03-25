'use client';

/**
 * BETALENT topbar — aligns to app shell 3-column grid.
 * Left brand = left sidebar; center search = main column; right actions = right sidebar.
 * Desktop shell: flex row 260px | flex-1 (search) | 280px — matches RootShell; no fragile CSS grid auto-rows.
 */

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { IconSearch, IconUser, IconAward, IconMenu } from '@/components/ui/Icons';
import NotificationsBell from '@/components/notifications/NotificationsBell';
import { ChatNavButton } from '@/components/chat/ChatNavButton';
import { APP_NAME } from '@/constants/app';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

type NavUser = { username: string; avatarUrl?: string | null };

/** Right-zone icon gap — tight, premium spacing */
const ICON_GAP = 'gap-1.5';
/** Shared transition — 150ms ease-out */
const TOPBAR_TRANSITION = 'transition-all duration-150 ease-out';
/** Icon touch target — hover/active micro-interactions */
const ICON_BTN =
  'inline-flex items-center justify-center shrink-0 h-10 w-10 min-h-10 min-w-10 rounded-[10px] text-white/80 hover:text-white/95 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98] ' +
  TOPBAR_TRANSITION;

export default function Navbar({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<NavUser | null | 'loading'>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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
    const q = searchRef.current?.value?.trim();
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/explore');
    }
  }

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
      {/* Mobile: flex row */}
      <div
        className={cn(
          'w-full min-w-0 flex items-center lg:hidden',
          'h-[var(--topbar-height)] px-[var(--layout-pad)]'
        )}
      >
        <div className="flex shrink-0 items-center min-w-0 gap-2">
          {onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className={cn('flex items-center justify-center shrink-0 h-10 w-10 -ml-1 rounded-[10px] text-white/80 hover:text-white hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98]', TOPBAR_TRANSITION)}
              aria-label="Open menu"
            >
              <IconMenu className="w-5 h-5 shrink-0" />
            </button>
          )}
          <Link
            href="/"
            aria-label={APP_NAME}
            className={cn('group inline-flex items-center min-w-0 gap-1.5 rounded-lg py-0.5 leading-none text-[17px] sm:text-[18px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/10 focus:ring-offset-2 focus:ring-offset-transparent', TOPBAR_TRANSITION)}
          >
            <img src="/logo.png" alt="" width={20} height={20} className="object-contain shrink-0 h-5 w-5" />
            <BrandWordmark variant="nav" />
          </Link>
        </div>
        <div className="flex flex-1 min-w-0 items-center justify-center px-2 sm:px-4">
          <form onSubmit={handleSearchSubmit} role="search" className={cn('group w-full min-w-0 max-w-[320px] hidden sm:block', TOPBAR_TRANSITION)}>
            <div
              className={cn(
                'relative w-full h-[38px] rounded-[10px] overflow-hidden bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]',
                TOPBAR_TRANSITION,
                searchFocused && 'border-white/[0.08] bg-white/[0.05]'
              )}
              style={{
                boxShadow: searchFocused
                  ? '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.04)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]" aria-hidden />
              <input
                ref={searchRef}
                name="q"
                type="search"
                placeholder={t('topbar.searchPlaceholder')}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="h-full w-full bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus:ring-0 focus-visible:outline-none"
              />
            </div>
          </form>
        </div>
        <div className={cn('flex shrink-0 items-center min-w-0 justify-end', ICON_GAP)}>
          <Link href="/explore" className={cn(ICON_BTN, 'sm:hidden')} aria-label={t('topbar.searchPlaceholder')}>
            <IconSearch className="w-[18px] h-[18px] shrink-0" />
          </Link>
          <Link href="/trending" className={ICON_BTN} aria-label={t('topbar.challenges')}>
            <IconAward className="w-[18px] h-[18px] shrink-0" />
          </Link>
          <div className="flex shrink-0 items-center justify-center [&_*]:min-w-0">
            <NotificationsBell />
          </div>
          {user === 'loading' && (
            <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
              <IconUser className="w-[18px] h-[18px] shrink-0" />
            </span>
          )}
          {user && user !== 'loading' && (
            <div className="relative flex shrink-0 items-center" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen((o) => !o)} className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')} aria-expanded={menuOpen}>
                <span className={cn('flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10', TOPBAR_TRANSITION, 'group-hover:ring-white/20')}>
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
          )}
          {user === null && (
            <Link href="/login" className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')}>
              <span className={cn('flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10', TOPBAR_TRANSITION, 'group-hover:ring-white/20')}>
                <IconUser className="w-[18px] h-[18px] shrink-0" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Desktop: flex rails match RootShell — avoids CSS grid placing a 3rd child on row 2 / col 1 when templates mismatch */}
      <div
        className="hidden lg:block w-full min-w-0 mx-auto"
        style={{ maxWidth: 'var(--shell-max-width)' }}
      >
        <div
          className={cn(
            'flex w-full min-w-0 items-center',
            'gap-x-6 desktop:gap-x-8',
            'h-[var(--topbar-height)] px-[var(--layout-pad, 16px)]'
          )}
        >
          <div className="flex w-[260px] min-w-[260px] shrink-0 items-center gap-2">
            <Link
              href="/"
              aria-label={APP_NAME}
              className={cn('group inline-flex items-center min-w-0 gap-1.5 rounded-lg py-0.5 leading-none text-[17px] sm:text-[18px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/10 focus:ring-offset-2 focus:ring-offset-transparent', TOPBAR_TRANSITION)}
            >
              <img src="/logo.png" alt="" width={20} height={20} className="object-contain shrink-0 h-5 w-5" />
              <BrandWordmark variant="nav" />
            </Link>
          </div>

          {hideGlobalRightPanel ? (
            <div className="flex flex-1 min-w-0 items-center">
              <div className="flex-1 min-w-0 shrink" aria-hidden />
              <form
                onSubmit={handleSearchSubmit}
                role="search"
                className={cn('group min-w-0 shrink max-w-[360px] w-full', TOPBAR_TRANSITION)}
              >
                <div
                  className={cn(
                    'relative w-full h-[38px] rounded-[10px] overflow-hidden bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]',
                    TOPBAR_TRANSITION,
                    searchFocused && 'border-white/[0.08] bg-white/[0.05]'
                  )}
                  style={{
                    boxShadow: searchFocused
                      ? '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.04)'
                      : 'inset 0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]" aria-hidden />
                  <input
                    ref={searchRef}
                    name="q"
                    type="search"
                    placeholder={t('topbar.searchPlaceholder')}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="h-full w-full bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus:ring-0 focus-visible:outline-none"
                  />
                </div>
              </form>
              <div className="flex flex-1 min-w-0 items-center justify-end">
                <div className={cn('flex shrink-0 items-center', ICON_GAP)}>
                  <Link href="/trending" className={ICON_BTN} aria-label={t('topbar.challenges')}>
                    <IconAward className="w-[18px] h-[18px] shrink-0" />
                  </Link>
                  <div className="flex shrink-0 items-center justify-center [&_*]:min-w-0">
                    <NotificationsBell />
                  </div>
                  {user && user !== 'loading' ? <ChatNavButton /> : null}
                  {user === 'loading' && (
                    <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
                      <IconUser className="w-[18px] h-[18px] shrink-0" />
                    </span>
                  )}
                  {user && user !== 'loading' && (
                    <div className="relative flex shrink-0 items-center" ref={menuRef}>
                      <button type="button" onClick={() => setMenuOpen((o) => !o)} className={ICON_BTN} aria-label={t('topbar.profile')} aria-expanded={menuOpen}>
                        <span className="flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10">
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
                          <Link href="/profile/me" className="block px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-white/10 transition-colors" onClick={() => setMenuOpen(false)}>
                            {t('topbar.profile')}
                          </Link>
                          <Link href="/settings" className="block px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/10 transition-colors" onClick={() => setMenuOpen(false)}>
                            Settings
                          </Link>
                          <button type="button" onClick={handleSignOut} className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/10 transition-colors border-t border-white/5">
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {user === null && (
                    <Link href="/login" className={ICON_BTN} aria-label={t('topbar.profile')}>
                      <span className="flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10">
                        <IconUser className="w-[18px] h-[18px] shrink-0" />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-1 min-w-0 items-center justify-center px-2 sm:px-4">
                <form
                  onSubmit={handleSearchSubmit}
                  role="search"
                  className={cn('group w-full min-w-0 max-w-[360px]', TOPBAR_TRANSITION)}
                >
                  <div
                    className={cn(
                      'relative w-full h-[38px] rounded-[10px] overflow-hidden bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]',
                      TOPBAR_TRANSITION,
                      searchFocused && 'border-white/[0.08] bg-white/[0.05]'
                    )}
                    style={{
                      boxShadow: searchFocused
                        ? '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.04)'
                        : 'inset 0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]" aria-hidden />
                    <input
                      ref={searchRef}
                      name="q"
                      type="search"
                      placeholder={t('topbar.searchPlaceholder')}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      className="h-full w-full bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus:ring-0 focus-visible:outline-none"
                    />
                  </div>
                </form>
              </div>
              <div className={cn('flex w-[280px] min-w-[280px] shrink-0 items-center justify-end', ICON_GAP)}>
                <Link href="/explore" className={cn(ICON_BTN, 'sm:hidden')} aria-label={t('topbar.searchPlaceholder')}>
                  <IconSearch className="w-[18px] h-[18px] shrink-0" />
                </Link>
                <Link href="/trending" className={ICON_BTN} aria-label={t('topbar.challenges')}>
                  <IconAward className="w-[18px] h-[18px] shrink-0" />
                </Link>
                <div className="flex shrink-0 items-center justify-center [&_*]:min-w-0">
                  <NotificationsBell />
                </div>
                {user && user !== 'loading' ? <ChatNavButton /> : null}
                {user === 'loading' && (
                  <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
                    <IconUser className="w-[18px] h-[18px] shrink-0" />
                  </span>
                )}
                {user && user !== 'loading' && (
                  <div className="relative flex shrink-0 items-center" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((o) => !o)}
                      className={cn(ICON_BTN, 'group')}
                      aria-label={t('topbar.profile')}
                      aria-expanded={menuOpen}
                    >
                      <span className={cn('flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10', TOPBAR_TRANSITION, 'group-hover:ring-white/20')}>
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
                        style={{
                          background: 'rgba(18,18,22,0.95)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}
                      >
                        <Link
                          href="/profile/me"
                          className={cn('block px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-white/[0.08]', TOPBAR_TRANSITION)}
                          onClick={() => setMenuOpen(false)}
                        >
                          {t('topbar.profile')}
                        </Link>
                        <Link
                          href="/settings"
                          className={cn('block px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/[0.08]', TOPBAR_TRANSITION)}
                          onClick={() => setMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className={cn('w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-white/80 hover:bg-white/[0.08] border-t border-white/5', TOPBAR_TRANSITION)}
                        >
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {user === null && (
                  <Link href="/login" className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')}>
                    <span className={cn('flex items-center justify-center overflow-hidden shrink-0 rounded-full w-8 h-8 bg-white/10 ring-1 ring-white/10', TOPBAR_TRANSITION, 'group-hover:ring-white/20')}>
                      <IconUser className="w-[18px] h-[18px] shrink-0" />
                    </span>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
