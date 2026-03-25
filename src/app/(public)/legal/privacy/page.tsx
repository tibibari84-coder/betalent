import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Privacy Policy – ${APP_NAME}`,
  description: `Privacy Policy for ${APP_NAME}. Learn how we collect, use, and protect your data.`,
};

export default function LegalPrivacyPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12 overflow-y-auto"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Privacy Policy
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2025
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                1. Information We Collect
              </h2>
              <p>
                We collect information you provide when registering (email, display name, username),
                content you upload (videos, comments), and usage data such as how you interact with
                the platform.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                2. How We Use It
              </h2>
              <p>
                We use your data to operate the service, personalize your experience, send relevant
                notifications, and improve our platform. We may use anonymized or aggregated data for
                analytics.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                3. Sharing
              </h2>
              <p>
                We do not sell your personal data. We may share data with service providers who help
                us run the platform (hosting, analytics). We may also disclose data when required by
                law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                4. Your Rights
              </h2>
              <p>
                You can access, correct, or delete your account and data from the{' '}
                <Link href={ROUTES.SETTINGS} className="text-accent hover:text-accent-hover underline">
                  Settings
                </Link>{' '}
                page. You may also export your data or request deletion by contacting us.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                5. Contact
              </h2>
              <p>
                For privacy-related inquiries, please visit our{' '}
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
