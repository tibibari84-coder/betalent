import { BrandMarkLockupAuth } from '@/components/brand/BrandMarkLockup';

/**
 * Standalone layout for auth pages only. No app shell (no navbar, sidebar, right panel, bottom nav).
 * Used by (auth) route group for /login and /register.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#050507] text-text-primary overflow-hidden">
      {/* Cinematic layered background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 10% -10%, rgba(196,18,47,0.32), transparent 55%), radial-gradient(circle at 80% 110%, rgba(196,18,47,0.24), transparent 60%), radial-gradient(circle at 50% 10%, rgba(255,255,255,0.05), transparent 55%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            'linear-gradient(140deg, rgba(0,0,0,0.9) 0%, rgba(5,5,8,0.96) 40%, rgba(5,5,8,0.98) 70%, rgba(0,0,0,1) 100%)',
        }}
      />

      {/* Page content — above decorative layers for reliable link/button hits */}
      <div className="relative z-[1] flex-1 flex flex-col">
        <header
          className="mx-auto flex w-full max-w-6xl items-center pt-6 sm:pt-8"
          style={{ paddingLeft: 'var(--topbar-pad-x)', paddingRight: 'var(--topbar-pad-x)' }}
        >
          <BrandMarkLockupAuth subtitle="GLOBAL TALENT PLATFORM" />
        </header>

        <main className="flex-1 flex items-stretch justify-center px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
