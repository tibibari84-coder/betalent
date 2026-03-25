'use client';

import { AppErrorBoundary } from '@/components/shared/AppErrorBoundary';
import { PerformanceModalProvider } from '@/contexts/PerformanceModalContext';
import { ViewerProvider } from '@/contexts/ViewerContext';

/** Shared providers for both authenticated (RootShell) and guest (PublicShell) experiences. */
export function ShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <PerformanceModalProvider>
        <ViewerProvider>{children}</ViewerProvider>
      </PerformanceModalProvider>
    </AppErrorBoundary>
  );
}
