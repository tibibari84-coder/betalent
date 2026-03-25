import { cookies } from 'next/headers';
import RegisterForm from '@/components/auth/RegisterForm';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthDivider,
  AuthLegalNote,
  GoogleContinueButton,
} from '@/components/auth/AuthExperience';

const REF_COOKIE = 'betalent_ref';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { ref?: string; error?: string };
}) {
  const refFromUrl = searchParams?.ref;
  const googleConfigError =
    searchParams?.error === 'google_not_configured' || searchParams?.error === 'google_config';
  const refFromCookie = (await cookies()).get(REF_COOKIE)?.value;
  const referrerId = refFromUrl ?? refFromCookie ?? undefined;

  return (
    <AuthSplitLayout
      brandEyebrow="Join the stage"
      brandTitle={
        <>
          Build a profile
          <br />
          <span className="text-accent">the world hears.</span>
        </>
      }
      brandSubtitle="Create a profile, join challenges when they run, and keep votes and uploads tied to one account."
      mobileTagline="Create your BETALENT account."
      brandFooter={
        <p className="text-[13px] text-white/40 leading-relaxed max-w-md pt-1">
          We send a one-time link to your inbox; it expires in 24 hours, same as the message states.
        </p>
      }
    >
      <AuthGlassCard scrollable>
        <AuthCardHeader
          eyebrow="Create account"
          title="Start with BETALENT"
          subtitle="You’ll confirm your email before protected areas unlock. That step checks inbox access only — separate from moderator-run creator checks when those apply."
        />
        <GoogleContinueButton />
        <AuthDivider />
        <p className="text-[12px] text-center text-white/45 leading-relaxed px-1 -mt-1 mb-1">
          Google sign-in uses Google&apos;s email verification. Email registration sends you a link — that confirms inbox access, not legal
          identity.
        </p>
        <RegisterForm referrerId={referrerId} googleConfigError={googleConfigError} />
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}
