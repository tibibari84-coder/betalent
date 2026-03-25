import { Suspense } from 'react';
import { GlobalTalentMap } from '@/components/global/GlobalTalentMap';

export const metadata = {
  title: 'Global Talent Map – BETALENT',
  description:
    'Explore rising voices, top performers, and new talent from around the world on the BETALENT Global Talent Map.',
};

export default function GlobalTalentMapPage() {
  return (
    <div
      className="relative min-h-[calc(100vh-60px)] w-full overflow-x-hidden pb-24 md:min-h-[calc(100vh-72px)] md:pb-12"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(196,18,47,0.30), transparent 55%), linear-gradient(180deg, #050507 0%, #050507 18%, #050507 40%, #050507 100%)',
      }}
    >
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8">
        <Suspense fallback={<div className="py-16 text-center text-[14px] text-white/60">Loading global talent…</div>}>
          <GlobalTalentMap />
        </Suspense>
      </div>
    </div>
  );
}

