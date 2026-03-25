import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `Fair Play & Authentic Performance – ${APP_NAME}`,
  description: `BETALENT Fair Play Policy. Cheating, multi-account abuse, and fake support are prohibited.`,
};

export default function FairPlayPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              Fair Play & Authentic Performance
            </h1>
            <p className="text-[15px] text-text-muted" suppressHydrationWarning>
              Last updated: March 2025
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section className="rounded-xl bg-white/[0.03] border border-white/10 p-5 md:p-6">
              <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4">
                Summary
              </h2>
              <p className="mb-4">
                BETALENT exists so every creator can compete on a level playing field and audiences can trust what they see. Fair play and authentic performance are at the heart of that.
              </p>
              <p className="mb-4">
                We do not allow multi-account cheating; fake support such as self-voting, self-gifting, or coordinated manipulation; stolen or duplicate videos; or deceptive or AI-manipulated singing when the platform or a challenge requires real performance. We take this seriously: we may review activity, remove unfair support from rankings, and restrict, suspend, or ban accounts that break these rules. Our goal is to keep the stage fair and trustworthy for everyone.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                What is prohibited
              </h2>
              <p className="mb-3">You may not:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use multiple accounts to support yourself or manipulate rankings</li>
                <li>Give or receive fake support, including self-gifting or self-support where disallowed</li>
                <li>Farm coins dishonestly (e.g. abuse daily bonuses or rewards)</li>
                <li>Manipulate super votes or gifts to unfairly boost yourself or others</li>
                <li>Upload stolen, duplicated, or re-uploaded performances that are not your own</li>
                <li>Upload fake, AI-generated or manipulated singing when the platform or a challenge requires real performance</li>
                <li>Bypass or abuse challenge fairness rules (e.g. originality, lip-sync, or support limits)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                How we enforce
              </h2>
              <p>
                We may review suspicious activity. Unfair support can be removed from rankings or challenge results. Accounts that violate these rules may be restricted, suspended, or banned. We use automated integrity checks and human review to keep the platform fair and trustworthy for creators and audiences.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Related policies
              </h2>
              <p>
                See our{' '}
                <Link href={ROUTES.CONTENT_POLICY} className="text-accent hover:text-accent-hover underline">
                  Content Policy
                </Link>{' '}
                for rules on originality, duplicates, and acceptable content. For privacy, see our{' '}
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
