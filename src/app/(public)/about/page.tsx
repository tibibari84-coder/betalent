import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, APP_SLOGAN, ROUTES } from '@/constants/app';

export const metadata: Metadata = {
  title: `About – ${APP_NAME}`,
  description: `Learn about ${APP_NAME}, the global digital stage for talent. ${APP_SLOGAN}.`,
};

export default function AboutPage() {
  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <article>
          <header className="mb-8 md:mb-10">
            <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
              About {APP_NAME}
            </h1>
            <p className="text-[18px] text-text-secondary leading-relaxed">
              {APP_SLOGAN}. We are building the world&apos;s stage for performers everywhere.
            </p>
          </header>

          <div className="space-y-6 text-[15px] text-text-secondary leading-[1.7]">
            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Our Mission
              </h2>
              <p>
                {APP_NAME} connects talented performers with a global audience. Whether you sing, dance,
                act, or create in any discipline, our platform gives you a stage to share your art,
                compete in challenges, and build your audience.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                How It Works
              </h2>
              <p>
                Create a profile, upload your performances, and enter weekly challenges. The community
                votes, and top performers are featured. You can also follow creators, send gifts, and
                engage with the talent that inspires you.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-text-primary mb-4">
                Join the Stage
              </h2>
              <p>
                Ready to showcase your talent? Join performers from around the world.
              </p>
              <Link
                href={ROUTES.REGISTER}
                className="btn-primary mt-4 inline-flex"
              >
                Create an account
              </Link>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
