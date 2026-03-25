import { BrandWordmark } from '@/components/brand/BrandWordmark';

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
        <header className="px-6 sm:px-8 pt-6 sm:pt-8 flex items-center max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border border-white/15 bg-gradient-to-br from-[#c4122f] to-[#4b0b18] shadow-[0_0_22px_rgba(196,18,47,0.55)] flex items-center justify-center text-sm font-semibold tracking-[0.08em] uppercase">
              BT
            </div>
            <div className="flex flex-col">
              <BrandWordmark
                variant="auth"
                className="text-[26px] sm:text-[30px]"
              />
              <span className="text-[11px] sm:text-[12px] tracking-[0.24em] text-text-muted/80 uppercase mt-1">
                GLOBAL TALENT PLATFORM
              </span>
            </div>
          </div>
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
