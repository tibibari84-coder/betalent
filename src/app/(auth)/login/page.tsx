import LoginForm from '@/components/auth/LoginForm';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthDivider,
  AuthLegalNote,
  GoogleContinueButton,
} from '@/components/auth/AuthExperience';

export default function LoginPage() {
  return (
    <AuthSplitLayout
      brandEyebrow="The stage"
      brandTitle={
        <>
          Spotlight
          <br />
          <span className="text-accent">on you</span>
        </>
      }
      brandSubtitle="Performances challenges community — one account"
      mobileTagline="Welcome back"
      brandFooter={<p className="text-[12px] text-white/34 leading-snug">Verified email unlocks uploads and wallet</p>}
    >
      <AuthGlassCard>
        <AuthCardHeader
          eyebrow="Access"
          title="Sign in"
          subtitle="Google or email — authenticator after password if you use 2FA"
        />
        <GoogleContinueButton />
        <AuthDivider />
        <LoginForm />
      </AuthGlassCard>
      <AuthLegalNote />
    </AuthSplitLayout>
  );
}
