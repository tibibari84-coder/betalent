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
      brandEyebrow="Creator platform"
      brandTitle={
        <>
          Your performance,
          <br />
          <span className="text-accent">their spotlight.</span>
        </>
      }
      brandSubtitle="Performances, challenges, and community tools in one account — with clear rules and email confirmation before protected areas open."
      mobileTagline="Welcome back. Sign in to continue."
      brandFooter={
        <p className="text-[13px] text-white/40 leading-relaxed max-w-md pt-1">
          Protected routes (dashboard, uploads, wallet, settings, and similar) require a confirmed email address.
        </p>
      }
    >
      <AuthGlassCard>
        <AuthCardHeader
          eyebrow="Sign in"
          title="Welcome back"
          subtitle="Sign in to continue. If you use 2FA, you’ll confirm with your authenticator app after your password."
        />
        <GoogleContinueButton />
        <AuthDivider />
        <LoginForm />
      </AuthGlassCard>
      <AuthLegalNote />
    </AuthSplitLayout>
  );
}
