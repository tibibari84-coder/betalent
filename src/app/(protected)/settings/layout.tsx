'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@/components/ui/Icons';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 min-h-[56px] px-4 py-2 border-b border-[rgba(255,255,255,0.06)]"
        style={{
          background: 'rgba(13,13,14,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-[12px] text-text-primary hover:bg-white/5 active:bg-white/8 transition-colors"
          aria-label="Back"
        >
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-[18px] font-semibold text-text-primary">
          Settings and Privacy
        </h1>
      </header>

      {children}
    </div>
  );
}
