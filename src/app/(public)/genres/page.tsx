'use client';

import Link from 'next/link';

const GENRES = [
  { slug: 'pop', name: 'Pop', descriptor: 'Chart-topping vocals and hooks' },
  { slug: 'rnb', name: 'R&B', descriptor: 'Smooth grooves and soulful delivery' },
  { slug: 'soul', name: 'Soul', descriptor: 'Emotion and raw expression' },
  { slug: 'jazz', name: 'Jazz', descriptor: 'Improvisation and swing' },
  { slug: 'rock', name: 'Rock', descriptor: 'Power and edge' },
  { slug: 'rap-hiphop', name: 'Rap / Hip-Hop', descriptor: 'Flow and wordplay' },
  { slug: 'gospel', name: 'Gospel', descriptor: 'Faith and uplift' },
  { slug: 'classical', name: 'Classical', descriptor: 'Opera and art song' },
  { slug: 'country', name: 'Country', descriptor: 'Storytelling and twang' },
  { slug: 'latin', name: 'Latin', descriptor: 'Rhythm and passion' },
  { slug: 'indie', name: 'Indie', descriptor: 'Independent spirit' },
  { slug: 'alternative', name: 'Alternative', descriptor: 'Boundary-pushing sound' },
  { slug: 'afrobeat', name: 'Afrobeat', descriptor: 'African rhythms and fusion' },
  { slug: 'blues', name: 'Blues', descriptor: 'Roots and feeling' },
  { slug: 'edm-dance', name: 'EDM / Dance', descriptor: 'Beats and energy' },
  { slug: 'folk', name: 'Folk', descriptor: 'Acoustic and narrative' },
  { slug: 'reggae', name: 'Reggae', descriptor: 'Groove and message' },
];

export default function GenresPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-12 min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      {/* 1. GENRES HERO HEADER */}
      <header
        className="relative flex flex-col justify-end px-4 md:px-6 laptop:px-8 pt-6 md:pt-8 laptop:pt-12 pb-6 md:pb-8 laptop:pb-10 min-h-[200px] md:min-h-[280px] laptop:min-h-[320px]"
        style={{
          background: 'linear-gradient(180deg, rgba(13,13,14,0.4) 0%, rgba(13,13,14,0.85) 50%, #0D0D0E 100%), radial-gradient(ellipse 80% 50% at 50% 0%, rgba(177,18,38,0.12) 0%, transparent 50%)',
        }}
      >
        <div className="w-full max-w-[1200px] mx-auto min-w-0 overflow-hidden">
          <p className="text-[11px] uppercase tracking-widest text-white/50 font-medium mb-1.5">
            Discover by Genre
          </p>
          <h1 className="font-display text-[24px] md:text-[36px] laptop:text-[42px] font-bold text-white tracking-tight leading-tight max-w-[640px] mb-2 laptop:mb-3">
            Find the sound that moves you
          </h1>
          <p className="text-[13px] md:text-[15px] laptop:text-[16px] text-white/70 max-w-[520px] mb-4 laptop:mb-6">
            Explore singers and music performers by style. From pop to gospel, jazz to rap—discover voices and vote for your favorites.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-[15px] border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Explore Challenges
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors"
            >
              Upload Your Performance
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 laptop:px-8 py-6 md:py-8 laptop:py-10 space-y-8 laptop:space-y-10 desktop:space-y-12 min-w-0">
        {/* 2. MAIN GENRE GRID */}
        <section>
          <h2 className="sr-only">Music genres</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {GENRES.map((g) => (
              <Link
                key={g.slug}
                href={`/explore?genre=${g.slug}`}
                className="group relative block h-[150px] rounded-[20px] border overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{
                  background: 'rgba(26,26,28,0.72)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                <div className="relative h-full flex flex-col justify-end p-4 md:p-5 min-w-0 overflow-hidden">
                  <p className="font-display text-[16px] md:text-[18px] font-semibold text-white tracking-tight group-hover:text-accent/90 transition-colors truncate">
                    {g.name}
                  </p>
                  <p className="text-[12px] text-white/50 mt-0.5 truncate">
                    {g.descriptor}
                  </p>
                  <p className="text-[11px] text-white/40 mt-2 truncate">
                    Explore
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Per-genre trending rails — not wired to live APIs on this page; use Explore (search + category) instead */}
        <section className="rounded-[18px] border px-5 py-6 md:px-6 md:py-7" style={{ background: 'rgba(26,26,28,0.45)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[15px] font-medium text-white/90 mb-1.5">Find performances by genre</p>
          <p className="text-[13px] text-white/55 mb-4 max-w-[560px] leading-relaxed">
            Genre-specific carousels are not loaded from the server on this page. Open Explore to browse real performances and filters.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl font-semibold text-[14px] text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            Open Explore
          </Link>
        </section>

        {/* 4. GENRE SPOTLIGHT */}
        <section>
          <Link
            href="/explore?genre=soul"
            className="group block rounded-[24px] border overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
            style={{
              background: 'linear-gradient(135deg, rgba(26,26,28,0.9) 0%, rgba(18,18,22,0.95) 100%)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="relative h-[280px] md:h-[320px] flex flex-col justify-end p-6 md:p-10">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'radial-gradient(ellipse 70% 80% at 70% 20%, rgba(177,18,38,0.25) 0%, transparent 50%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)',
                }}
              />
              <p className="relative text-[11px] uppercase tracking-widest text-accent/90 font-medium mb-2">
                Spotlight
              </p>
              <h3 className="relative font-display text-[28px] md:text-[36px] font-bold text-white tracking-tight mb-2">
                Soul Voices Rising
              </h3>
              <p className="relative text-[15px] md:text-[16px] text-white/70 max-w-[480px] mb-6">
                Raw emotion and powerhouse vocals. Discover the performers redefining soul on BETALENT this season.
              </p>
              <span className="relative inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-[15px] text-white bg-accent hover:bg-accent-hover transition-colors w-fit">
                Explore Soul
              </span>
            </div>
          </Link>
        </section>

        {/* 6. UPLOAD CTA */}
        <section>
          <div
            className="rounded-[24px] border p-8 md:p-10 text-center"
            style={{
              background: 'rgba(26,26,28,0.72)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="font-display text-[22px] md:text-[26px] font-semibold text-white tracking-tight mb-2">
              Ready to share your sound?
            </h3>
            <p className="text-[15px] text-white/60 mb-6 max-w-[420px] mx-auto">
              Join performers worldwide. Upload a performance and get discovered by fans and judges.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold text-[16px] text-white bg-accent hover:bg-accent-hover transition-colors"
            >
              Upload a Performance
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
