'use client';

import Link from 'next/link';

/**
 * Settings-only right rail: secondary, low visual weight (does not compete with main forms).
 */
export function SettingsRightAside() {
  return (
    <div
      className="space-y-3 text-[12px] leading-relaxed opacity-[0.82]"
      style={{ color: 'rgba(245,245,245,0.68)' }}
    >
      <div
        className="rounded-2xl border px-3.5 py-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">Quick tips</p>
        <ul className="space-y-2 text-white/60 list-disc list-inside marker:text-white/30">
          <li>Save changes when switching sections if prompted.</li>
          <li>Avatar uploads are cropped to a circle on save.</li>
          <li>Language applies after you save.</li>
        </ul>
      </div>

      <div
        className="rounded-2xl border px-3.5 py-3 space-y-1.5"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Legal</p>
        <div className="flex flex-col gap-1.5">
          <Link href="/privacy" className="text-white/55 hover:text-white/85 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-white/55 hover:text-white/85 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-white/35 px-1 leading-snug">
        Need help? Use Contact from the footer or your account email for support.
      </p>
    </div>
  );
}
