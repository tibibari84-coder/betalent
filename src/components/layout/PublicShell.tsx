'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import PerformanceModal from '@/components/performance/PerformanceModal';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import Footer from '@/components/layout/Footer';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicMobileNav from '@/components/layout/PublicMobileNav';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { isMobileOrTabletDevice } from '@/lib/device';
import GlobalGiftCelebrationHost from '@/components/gift/GlobalGiftCelebrationHost';

function PublicShellInner({ children }: { children: React.ReactNode }) {
  const { videoId, onClose } = usePerformanceModal();
  const [hasMobileNav, setHasMobileNav] = useState(false);

  useEffect(() => {
    setHasMobileNav(isMobileOrTabletDevice());
  }, []);

  return (
    <>
      <div className="app-shell flex flex-col flex-1 min-h-0 w-full min-w-0">
        <PublicNavbar />
        <div
          className={cn('flex-1 w-full min-w-0 box-border min-h-0 pt-[var(--shell-content-gap-mobile)] laptop:pt-[var(--shell-content-gap-desktop)] mx-auto')}
          style={{
            maxWidth: 'var(--shell-max-width)',
            paddingLeft: 'var(--layout-pad, 16px)',
            paddingRight: 'var(--layout-pad, 16px)',
          }}
        >
          <main
            className="min-w-0 w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden"
            role="main"
            style={{
              paddingBottom: hasMobileNav
                ? 'calc(var(--bottom-nav-height) + max(10px, env(safe-area-inset-bottom, 0px)) + 12px)'
                : 0,
            }}
          >
            {children}
          </main>
        </div>
        <Footer />
        <PublicMobileNav />
      </div>
      <PerformanceModal videoId={videoId} isOpen={!!videoId} onClose={onClose} />
    </>
  );
}

/** Guest experience: marketing + discovery surfaces without internal app chrome. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProviders>
      <PublicShellInner>{children}</PublicShellInner>
      <GlobalGiftCelebrationHost />
    </ShellProviders>
  );
}
