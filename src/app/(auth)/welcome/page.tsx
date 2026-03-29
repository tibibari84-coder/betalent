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
      brandEyebrow="Live"
      brandTitle={
        <>
          The world
          <br />
          <span className="text-accent">is watching</span>
        </>
      }
      brandSubtitle="Upload · challenge · connect"
      mobileTagline="Sign in or join"
      brandFooter={
        <p className="text-[12px] text-white/34 leading-snug">
          <Link href="/landing" className="text-accent/85 hover:text-accent transition-colors">
            Discover BETALENT
          </Link>
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
