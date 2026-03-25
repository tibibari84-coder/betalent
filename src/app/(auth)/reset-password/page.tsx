'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthAlert,
  AuthSuccessMark,
  PasswordStrengthMeter,
  AuthLegalNote,
} from '@/components/auth/AuthExperience';
import { validatePasswordPolicyForUser } from '@/lib/validations';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') ?? '';
  const emailFromLink = searchParams?.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('This page needs a valid link from your email.');
      return;
    }
    const policy = validatePasswordPolicyForUser(password, emailFromLink || null);
    if (!policy.ok) {
      setError(policy.message);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = await r.json().catch(() => ({}));
      if (!data.ok) {
        const m = data.message ?? 'Reset failed.';
        setError(
          m.toLowerCase().includes('expired')
            ? 'This reset link has expired. Request a new one from sign in.'
            : m
        );
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push('/login?reset=1');
        router.refresh();
      }, 2200);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      brandEyebrow="Security"
      brandTitle={
        <>
          New password,
          <br />
          <span className="text-accent">same account.</span>
        </>
      }
      brandSubtitle="Choose a strong password you don’t reuse elsewhere. After this, sign in with email and password or Google if linked."
      mobileTagline="Set a new password."
    >
      <AuthGlassCard>
        {done ? (
          <div className="text-center space-y-5 py-2">
            <AuthSuccessMark className="mx-auto" />
            <AuthAlert tone="success">Password updated. Redirecting to sign in…</AuthAlert>
          </div>
        ) : (
          <>
            <AuthCardHeader
              eyebrow="Reset password"
              title="Choose a new password"
              subtitle="At least 8 characters with uppercase, lowercase, a number, and a symbol (e.g. ! @ # $)."
            />
            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              {!token ? (
                <AuthAlert tone="warning">Open this page from the link in your email. If the link expired, request a new reset from sign in.</AuthAlert>
              ) : null}
              {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
              <div className="space-y-3">
                <AuthPasswordField id="reset-pw" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
                {password.length > 0 ? <PasswordStrengthMeter password={password} /> : null}
              </div>
              <AuthPasswordField
                id="reset-confirm"
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />
              <AuthPrimaryButton loading={loading} disabled={!token}>
                Update password
              </AuthPrimaryButton>
            </form>
            <p className="text-center mt-8">
              <Link href="/login" className="text-[14px] font-medium text-accent hover:text-accent-hover transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-text-muted text-sm">Loading…</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
