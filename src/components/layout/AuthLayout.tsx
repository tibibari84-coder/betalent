/**
 * Standalone layout for auth pages only. No app shell (no navbar, sidebar, right panel, bottom nav).
 * Used by (auth) route group for /login and /register.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] min-h-screen flex flex-col bg-[#030304] text-text-primary overflow-x-hidden">
      {/* Cinematic stage: deep black + cherry wine glow + soft spotlight falloff */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% -15%, rgba(120,20,40,0.22), transparent 52%), radial-gradient(ellipse 70% 55% at 12% 30%, rgba(196,18,47,0.14), transparent 50%), radial-gradient(ellipse 60% 50% at 88% 65%, rgba(90,12,28,0.18), transparent 55%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.85]"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.55), transparent 45%), linear-gradient(165deg, #000000 0%, #060608 38%, #08080a 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-[0.07]"
        aria-hidden
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.45), transparent 42%)',
        }}
      />

      <div className="relative z-[1] flex-1 flex flex-col">
        <main className="flex-1 flex items-stretch justify-center px-4 sm:px-6 lg:px-10 py-7 sm:py-10 lg:py-12">
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-14 items-stretch">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
