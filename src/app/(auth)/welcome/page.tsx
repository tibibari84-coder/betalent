import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AuthSplitLayout, AuthGlassCard, AuthLegalNote } from '@/components/auth/AuthExperience';
import { WelcomeAuthCard } from '@/components/auth/WelcomeAuthCard';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const session = await getSession();
  const isAppMember = Boolean(session.user && !session.pending2FAUserId && session.user.emailVerified);
  if (isAppMember) {
    redirect('/feed');
  }

  return (
    <AuthSplitLayout
      brandEyebrow="Global talent platform"
      brandTitle={
        <>
          Show the World
          <br />
          <span className="text-accent">Your Talent</span>
        </>
      }
      brandSubtitle="Join performers from around the world. Create an account to upload performances, compete in weekly challenges, and let the audience decide who rises."
      mobileTagline="Sign in or create an account to get started."
      brandFooter={
        <p className="text-[13px] text-white/40 leading-relaxed max-w-md pt-1">
          Want to learn more first? <Link href="/landing" className="text-accent/90 hover:text-accent underline">See what BETALENT offers</Link>.
        </p>
      }
    >
      <AuthGlassCard>
        <WelcomeAuthCard />
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}
