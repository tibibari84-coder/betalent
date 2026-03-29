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
      brandEyebrow="Join"
      brandTitle={
        <>
          Your name
          <br />
          <span className="text-accent">in lights</span>
        </>
      }
      brandSubtitle="One profile for challenges gifts and growth"
      mobileTagline="Create your account"
      brandFooter={<p className="text-[12px] text-white/34 leading-snug">Verification link expires in 24 hours</p>}
    >
      <AuthGlassCard scrollable>
        <AuthCardHeader
          eyebrow="Start"
          title="Create account"
          subtitle="Confirm email to unlock uploads and the rest of the stage"
        />
        <GoogleContinueButton />
        <AuthDivider />
        <RegisterForm referrerId={referrerId} googleConfigError={googleConfigError} />
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}
