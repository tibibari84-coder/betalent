import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Terms of Service – ${APP_NAME}`,
  description: `Terms of Service for ${APP_NAME}. Please read these terms before using the platform.`,
};

export default function LegalTermsPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12 overflow-y-auto"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2025
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                1. Acceptance
              </h2>
              <p>
                By using {APP_NAME}, you agree to these Terms of Service and our Creator Rules. If you do not agree,
                please do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                2. Eligibility
              </h2>
              <p>
                You must be at least 13 years of age to use {APP_NAME}. If you are under 18, you confirm that a parent
                or guardian has reviewed and agreed to these terms on your behalf.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                3. User Content
              </h2>
              <p>
                You retain ownership of content you upload. By posting, you grant {APP_NAME} a non-exclusive license to
                display, distribute, and promote your content in connection with the service. You must not upload
                content that infringes others&apos; rights or violates applicable law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                4. Conduct
              </h2>
              <p>
                You agree to use {APP_NAME} responsibly. Harassment, hate speech, spam, and impersonation are prohibited.
                We may suspend or terminate accounts that violate these standards.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                5. Related Policies
              </h2>
              <p>
                See our{' '}
                <Link href={ROUTES.LEGAL_CREATOR_RULES} className="text-accent hover:text-accent-hover underline">
                  Creator Rules
                </Link>
                ,{' '}
                <Link href={ROUTES.LEGAL_PRIVACY} className="text-accent hover:text-accent-hover underline">
                  Privacy Policy
                </Link>
                , and{' '}
                <Link href={ROUTES.CONTACT} className="text-accent hover:text-accent-hover underline">
                  Contact
                </Link>{' '}
                page.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
