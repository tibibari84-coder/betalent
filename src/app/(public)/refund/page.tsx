import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Refund Policy – ${APP_NAME}`,
  description: `Refund Policy for ${APP_NAME}. Learn when refunds may be issued for Coin purchases.`,
};

export default function RefundPage() {
  return (
    <div className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12" style={{ backgroundColor: '#0D0D0E' }}>
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Refund Policy
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2026
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                1. Coin Purchases
              </h2>
              <p>
                All Coin purchases are final and non-refundable once delivered to your account.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                2. Exceptions
              </h2>
              <p>
                Refunds may be issued only in limited cases such as duplicate transactions, technical errors,
                or unauthorized payments. Where applicable, we may investigate and request supporting information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                3. How to Request Help
              </h2>
              <p>
                Please use our{' '}
                <Link href={ROUTES.CONTACT} className="text-accent hover:text-accent-hover underline">
                  Contact
                </Link>{' '}
                page and include the email on your account, the approximate time of purchase, and any relevant transaction details.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                4. Processing
              </h2>
              <p>
                If a refund is approved, it will be processed back to the original payment method when possible.
                Timing may vary depending on your payment provider.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}

