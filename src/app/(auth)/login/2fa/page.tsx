'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthAlert,
  AuthTrustStrip,
  AuthLegalNote,
} from '@/components/auth/AuthExperience';

function TwoFactorForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawFrom = searchParams?.get('from');
  const redirectTo =
    typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/feed';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.replace(/\s/g, '') }),
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 429 || (data.message && String(data.message).toLowerCase().includes('too many'))) {
          setError('Too many attempts. Wait a moment, then try again.');
        } else {
          setError(data.message ?? 'Invalid code. Check your authenticator app.');
        }
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      brandEyebrow="Two-factor"
      brandTitle={
        <>
          Confirm
          <br />
          <span className="text-accent">it&apos;s you.</span>
        </>
      }
      brandSubtitle="This step is separate from email verification. It protects your account if your password is ever exposed."
      mobileTagline="Enter your authenticator code."
    >
      <AuthGlassCard>
        <AuthCardHeader
          eyebrow="Security check"
          title="Authenticator code"
          subtitle="Open your authenticator app and enter the 6-digit code for BETALENT."
        />
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
          <div>
            <label htmlFor="totp" className="block text-center text-[13px] font-medium text-white/60 mb-2">
              6-digit code from your app
            </label>
            <input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-label="Six-digit authenticator code"
              className="w-full min-h-[56px] px-4 rounded-[14px] text-center text-2xl tracking-[0.5em] font-medium bg-black/35 border border-white/[0.08] text-text-primary focus:outline-none focus:ring-2 focus:ring-[rgba(196,18,47,0.25)] focus:border-[rgba(196,18,47,0.45)] transition-all"
            />
          </div>
          <AuthTrustStrip />
          <AuthPrimaryButton loading={loading} disabled={code.length < 6}>
            Continue
          </AuthPrimaryButton>
        </form>
        <div className="mt-8 space-y-3">
          <AuthSecondaryButton
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              router.push('/login');
              router.refresh();
            }}
          >
            Sign out and start over
          </AuthSecondaryButton>
        </div>
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}

export default function LoginTwoFactorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-text-muted text-sm">Loading…</div>
      }
    >
      <TwoFactorForm />
    </Suspense>
  );
}
