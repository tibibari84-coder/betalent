import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Creator Rules – ${APP_NAME}`,
  description: `BETALENT Creator Rules. Real performance, no playback, no lip-sync. Authentic talent only.`,
};

export default function LegalCreatorRulesPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12 overflow-y-auto"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Creator Rules
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2025
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section className="rounded-xl bg-white/[0.03] border border-white/10 p-5 md:p-6">
              <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4">
                Core Rules
              </h2>
              <p className="mb-4">
                {APP_NAME} is a real talent platform. Every performance must be authentic.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-text-primary">No playback.</strong> You must perform live. Pre-recorded backing tracks are allowed for accompaniment only, not for vocals or primary performance.</li>
                <li><strong className="text-text-primary">No lip-sync.</strong> Your voice and performance must be real. Lip-syncing to pre-recorded audio is not allowed.</li>
                <li><strong className="text-text-primary">Real performance required.</strong> Every video must show you actually performing. BETALENT celebrates real talent.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Content Types
              </h2>
              <p>
                When uploading, you must correctly label your content as Original, Cover, or Remix. You confirm you have
                the rights to use any material you include. Covers and remixes must comply with applicable licensing.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Live Performances
              </h2>
              <p>
                Before going live, you agree that your voice is real, your camera is active, and you are not using
                playback. Violations may result in content removal or account restrictions.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Enforcement
              </h2>
              <p>
                We use automated integrity checks and human review. Reported content may be removed. Repeated violations may
                lead to account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Related Policies
              </h2>
              <p>
                See our{' '}
                <Link href={ROUTES.LEGAL_TERMS} className="text-accent hover:text-accent-hover underline">
                  Terms of Service
                </Link>
                ,{' '}
                <Link href={ROUTES.FAIR_PLAY} className="text-accent hover:text-accent-hover underline">
                  Fair Play
                </Link>
                , and{' '}
                <Link href={ROUTES.LEGAL_PRIVACY} className="text-accent hover:text-accent-hover underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
