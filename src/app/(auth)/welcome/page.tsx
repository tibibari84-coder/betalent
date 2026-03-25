import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthDivider,
  AuthLegalNote,
  GoogleContinueButton,
} from '@/components/auth/AuthExperience';
import {
  ACCENT_PRIMARY_GRADIENT,
  accentAlpha,
} from '@/constants/accent-tokens';

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
        <AuthCardHeader
          eyebrow="Get started"
          title="Join BETALENT"
          subtitle="Create an account, sign in, or continue with Google. You’ll confirm your email before protected areas unlock."
        />
        <div className="space-y-3">
          <Link
            href="/register"
            className="google-btn relative z-[2] flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[14px] text-[14px] font-semibold text-white transition-all"
            style={{
              background: ACCENT_PRIMARY_GRADIENT,
              boxShadow: `0 2px 12px ${accentAlpha(0.25)}`,
            }}
          >
            Register
          </Link>
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[14px] border border-white/[0.12] bg-white/[0.04] text-[14px] font-medium text-text-primary/95 hover:bg-white/[0.08]"
          >
            Sign in
          </Link>
        </div>
        <AuthDivider />
        <GoogleContinueButton />
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}
