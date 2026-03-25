'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthCardHeader,
  AuthTextField,
  AuthPrimaryButton,
  AuthAlert,
  AuthLegalNote,
} from '@/components/auth/AuthExperience';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      brandEyebrow="Account recovery"
      brandTitle={
        <>
          Locked out?
          <br />
          <span className="text-accent">We&apos;ll help you back in.</span>
        </>
      }
      brandSubtitle="Password reset uses a time-limited link to your email. Same inbox trust as signup — no SMS codes."
      mobileTagline="Reset your password securely."
    >
      <AuthGlassCard>
        <AuthCardHeader
          eyebrow="Forgot password"
          title="Reset by email"
          subtitle="Enter the email on your BETALENT account. If it exists, we send a reset link that expires in one hour."
        />
        {sent ? (
          <AuthAlert tone="success">
            If an account exists for that address, we sent reset instructions. Check spam folders if nothing arrives in a few minutes.
          </AuthAlert>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <AuthTextField
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <AuthPrimaryButton loading={loading} type="submit">
              Send reset link
            </AuthPrimaryButton>
          </form>
        )}
        <p className="text-center mt-8">
          <Link href="/login" className="text-[14px] font-medium text-accent hover:text-accent-hover transition-colors">
            Back to sign in
          </Link>
        </p>
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}
