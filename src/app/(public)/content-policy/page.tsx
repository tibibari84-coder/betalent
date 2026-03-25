import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Content & Originality Policy – ${APP_NAME}`,
  description: `BETALENT Content Policy. Original performances, no stolen or duplicate content, no fake or misleading uploads.`,
};

export default function ContentPolicyPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Content & Originality Policy
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2025
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Authentic performances
              </h2>
              <p>
                BETALENT is a stage for real talent. Uploads should be your own performances. Stolen
                videos, duplicate reposts of others’ work, or content that misleads viewers about who
                is performing are not allowed.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                AI-generated and manipulated content
              </h2>
              <p>
                AI-generated fake singing voices or heavily manipulated vocal content may be
                restricted or subject to review. Challenge rules may require original vocal
                performance; synthetic or misleading content can be removed from rankings or
                disqualified. We rely on review and integrity checks to keep competition fair.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Duplicates and reuse
              </h2>
              <p>
                Do not re-upload the same performance under multiple accounts or upload content you
                do not have the right to use. Near-duplicate or copied performances may be flagged,
                and repeated violations can lead to account action.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Challenge-specific rules
              </h2>
              <p>
                Some challenges require original vocal performance, prohibit lip-sync, or set other
                originality rules. By entering, you agree to those rules. Submissions that violate
                them may be rejected or removed from leaderboards.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Related policies
              </h2>
              <p>
                Our{' '}
                <Link href={ROUTES.FAIR_PLAY} className="text-accent hover:text-accent-hover underline">
                  Fair Play Policy
                </Link>{' '}
                covers anti-cheat, multi-account abuse, and fake support. For privacy, see our{' '}
                <Link href={ROUTES.PRIVACY} className="text-accent hover:text-accent-hover underline">
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
