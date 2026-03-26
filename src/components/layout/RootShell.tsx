'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { ChatPanelProvider } from '@/contexts/ChatPanelContext';
import { DmSlidingPanel } from '@/components/chat/DmSlidingPanel';
import GlobalGiftCelebrationHost from '@/components/gift/GlobalGiftCelebrationHost';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/layout/Footer';
import PerformanceModal from '@/components/performance/PerformanceModal';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';
import { isMobileOrTabletDevice } from '@/lib/device';

function RootShellContent({ children }: { children: React.ReactNode }) {
  const { videoId, onClose } = usePerformanceModal();
  const [hasMobileNav, setHasMobileNav] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isImmersiveFeedRoute = pathname === '/feed';
  /** Settings uses its own 3-column grid inside main; global RightPanel would crush the layout */
  const isSettingsRoute = pathname === '/settings' || (pathname?.startsWith('/settings/') ?? false);
  const hideGlobalRightPanel = isImmersiveFeedRoute || isSettingsRoute;

  useEffect(() => {
    setHasMobileNav(isMobileOrTabletDevice());
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="app-shell flex flex-col flex-1 min-h-0 w-full min-w-0">
          <Navbar onOpenDrawer={() => setDrawerOpen(true)} />
          <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
          {/* lg+: flex row — Sidebar | main | Right rail from shell tokens (except /feed & /settings). */}
          <div
            className={cn(
              'flex-1 w-full min-w-0 box-border min-h-0 mx-auto',
              isImmersiveFeedRoute || isSettingsRoute ? 'pt-0 laptop:pt-0' : 'pt-[var(--shell-content-gap-mobile)] laptop:pt-[var(--shell-content-gap-desktop)]'
            )}
            style={{
              maxWidth: 'var(--shell-max-width)',
              paddingLeft: 'var(--topbar-pad-x)',
              paddingRight: 'var(--topbar-pad-x)',
            }}
          >
            {/*
              Flex (not CSS grid) for 3 rails: avoids auto-placement bug where 3 children + 2 template cols
              drops the third item into row 2 / column 1 (misplaced chrome). Side rails use shrink-0 + fixed
              width so min-w-0 on main can shrink without clipping the right panel via overflow-x: clip.
            */}
            <div
              className={cn(
                'flex w-full min-w-0 min-h-0 flex-col gap-y-6 lg:flex-row lg:items-stretch lg:gap-y-0 h-full'
              )}
              style={{ columnGap: 'var(--shell-gap)' }}
            >
              <aside
                className="hidden lg:block shrink-0 sticky self-start overflow-y-auto overflow-x-hidden order-2 lg:order-1"
                style={{
                  width: 'var(--shell-sidebar)',
                  minWidth: 'var(--shell-sidebar)',
                  top: 'var(--topbar-height)',
                  maxHeight: 'calc(100vh - var(--topbar-height))',
                  background: 'rgba(8, 8, 10, 0.95)',
                }}
                aria-label="Main navigation"
              >
                <Sidebar />
              </aside>
              <main
                className={cn(
                  'min-w-0 w-full flex flex-col flex-1 order-1 lg:order-2 min-h-0',
                  isImmersiveFeedRoute
                    ? 'overflow-hidden overflow-x-hidden lg:overflow-hidden'
                    : 'overflow-y-auto overflow-x-hidden'
                )}
                role="main"
                style={{
                  overflowX: isImmersiveFeedRoute ? 'hidden' : 'visible',
                  paddingBottom: isImmersiveFeedRoute
                    ? 0
                    : hasMobileNav
                      ? 'calc(var(--bottom-nav-height) + max(10px, env(safe-area-inset-bottom, 0px)) + 12px)'
                      : 0,
                }}
              >
                {children}
              </main>
              {!hideGlobalRightPanel ? (
                <aside
                  className={cn(
                    'flex flex-col w-full min-w-0 overflow-y-auto overflow-x-hidden order-3',
                    'lg:shrink-0',
                    'lg:sticky lg:self-start'
                  )}
                  style={{
                    width: 'var(--shell-right)',
                    minWidth: 'var(--shell-right)',
                    maxWidth: 'var(--shell-right)',
                    top: 'var(--topbar-height)',
                    maxHeight: 'calc(100vh - var(--topbar-height))',
                    background: 'rgba(8, 8, 10, 0.95)',
                  }}
                  aria-label="Utility cards"
                >
                  <RightPanel />
                </aside>
              ) : null}
            </div>
          </div>
          {!isImmersiveFeedRoute && !isSettingsRoute ? <Footer /> : null}
          <MobileNav />
        </div>
      <PerformanceModal
        videoId={videoId}
        isOpen={!!videoId}
        onClose={onClose}
      />
    </>
  );
}

export function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProviders>
      <ChatPanelProvider>
        <RootShellContent>{children}</RootShellContent>
        <DmSlidingPanel />
        <GlobalGiftCelebrationHost />
      </ChatPanelProvider>
    </ShellProviders>
  );
}
