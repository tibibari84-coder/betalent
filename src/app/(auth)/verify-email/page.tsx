'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { maskEmail } from '@/lib/mask-email';
import {
  AuthSplitLayout,
  AuthGlassCard,
  AuthSecondaryButton,
  AuthAlert,
  AuthSuccessMark,
  AuthTrustStrip,
  AuthLegalNote,
} from '@/components/auth/AuthExperience';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  const registered = searchParams?.get('registered') === '1';
  const emailPending = searchParams?.get('email') === 'pending';
  const gateRequired = searchParams?.get('required') === '1';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendTone, setResendTone] = useState<'info' | 'warning' | 'error'>('info');
  const [cooldown, setCooldown] = useState(0);
  const [registrationEmailHint, setRegistrationEmailHint] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (!registered) return;
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !data.user?.email) return;
        setMaskedEmail(maskEmail(data.user.email));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [registered]);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      setMessage('');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setMessage('');
    (async () => {
      const r = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (cancelled) return;
      if (data.ok) {
        setStatus('success');
        setMessage(
          'Your email is verified. Protected areas that require a confirmed address are now available, subject to normal account rules.',
        );
        await fetch('/api/auth/session/refresh', { method: 'POST', credentials: 'include' }).catch(() => {});
      } else {
        setStatus('error');
        const m = data.message ?? 'Verification failed.';
        setMessage(
          m.toLowerCase().includes('expired')
            ? 'This link has expired. Request a fresh email below.'
            : m
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const resend = useCallback(async () => {
    if (cooldown > 0) return;
    setResendBusy(true);
    setResendMsg(null);
    try {
      const r = await fetch('/api/auth/resend-verification', { method: 'POST', credentials: 'include' });
      const data = await r.json().catch(() => ({}));
      if (r.status === 429) {
        setResendTone('warning');
        setResendMsg(data.message ?? 'Too many requests. Please wait before trying again.');
      } else if (data.ok) {
        setResendTone('info');
        setResendMsg(data.message ?? 'If you are logged in, we sent another message.');
        setCooldown(60);
      } else {
        setResendTone('error');
        setResendMsg(data.message ?? 'Could not resend. Sign in first, then try again.');
      }
    } catch {
      setResendTone('error');
      setResendMsg('Network error. Try again.');
    } finally {
      setResendBusy(false);
    }
  }, [cooldown]);

  const showInboxPanel = (registered || emailPending) && status !== 'success' && status !== 'loading';

  return (
    <AuthSplitLayout
      brandEyebrow="Account security"
      brandTitle={
        <>
          One inbox.
          <br />
          <span className="text-accent">Your address, confirmed.</span>
        </>
      }
      brandSubtitle="Email verification protects the community from throwaway abuse. It confirms you receive mail at this address — not government ID or payment identity."
      mobileTagline="Verify your email to continue."
      brandFooter={
        <p className="text-[13px] text-white/40 leading-relaxed max-w-md pt-1">
          Creator verification and badges are separate when offered by moderators.
        </p>
      }
    >
      <AuthGlassCard>
        {gateRequired && status !== 'success' ? (
          <AuthAlert tone="warning" key="gate">
            Confirm your email to open protected routes (for example feed, upload, profile, wallet, settings, and creator tools).
            Public pages stay available.
          </AuthAlert>
        ) : null}

        {registrationEmailHint && status !== 'success' ? (
          <div className="mb-4">
            <AuthAlert tone="warning" key="email-hint">
              We could not send the verification email automatically: {registrationEmailHint} Use &quot;Resend verification email&quot;
              below after the operator sets RESEND_API_KEY or SENDGRID_API_KEY on the server, or check spam folders if it was sent.
            </AuthAlert>
          </div>
        ) : null}

        <div className={`text-center mb-6 ${gateRequired && status !== 'success' ? 'mt-5' : ''}`}>
          {status === 'success' ? (
            <AuthSuccessMark className="mb-5" />
          ) : (
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
              aria-hidden
            >
              <svg className="w-7 h-7 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
          )}
          <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/40 font-semibold mb-2">
            Email verification
          </p>
          <h1 className="font-display text-[1.65rem] sm:text-[1.85rem] font-semibold text-text-primary tracking-[-0.035em] leading-tight">
            {status === 'success' ? "You're verified" : 'Check your inbox'}
          </h1>
        </div>

        {maskedEmail && status !== 'success' ? (
          <p className="text-center text-[14px] text-text-secondary/95 mb-5">
            We sent a verification link to <span className="text-text-primary font-medium">{maskedEmail}</span>
          </p>
        ) : null}

        {status === 'loading' ? (
          <p className="text-center text-[14px] text-white/45 mb-5">Confirming your link…</p>
        ) : null}

        {status === 'success' ? (
          <div className="space-y-5">
            <AuthAlert tone="success">{message}</AuthAlert>
            <Link
              href="/feed?welcome=1"
              className="flex w-full min-h-[48px] items-center justify-center rounded-[14px] font-semibold text-[15px] text-white bg-gradient-to-b from-[#d41936] to-[#9b0e24] border border-white/10 shadow-[0_8px_28px_rgba(196,18,47,0.28)] hover:from-[#e01e3d] hover:to-[#b01028] transition-all"
            >
              Continue to BETALENT
            </Link>
            <p className="text-center text-[13px] text-white/55 leading-relaxed">
              Next: Upload your first performance, explore talent, or join a challenge.
            </p>
            <p className="text-center text-[13px] text-white/45">
              <Link href="/login" className="text-accent hover:text-accent-hover font-medium">
                Sign in on another device
              </Link>
            </p>
          </div>
        ) : null}

        {status === 'error' ? <AuthAlert tone="error">{message}</AuthAlert> : null}

        {showInboxPanel ? (
          <div className="space-y-5">
            <p className="text-[14px] leading-relaxed text-text-secondary/95 text-center">
              Open the message from BETALENT and tap <strong className="text-text-primary">Verify email</strong>. Links expire after 24
              hours for your security.
            </p>
            <p className="text-[12px] text-center text-white/40 leading-relaxed">
              Verification uses the link in email only — not SMS. For sign-in, optional two-factor authentication uses your authenticator app
              if you enable it in settings.
            </p>
            <AuthTrustStrip />
          </div>
        ) : null}

        {status === 'idle' && !token && !registered && !emailPending ? (
          <div className="space-y-3 text-center">
            <p className="text-[14px] text-text-secondary/95 leading-relaxed">
              Open the link from your email, or sign in and use resend if you still have an active session.
            </p>
            <p className="text-[13px] text-white/45">
              Need to start over?{' '}
              <Link href="/register" className="font-medium text-accent hover:text-accent-hover">
                Create account
              </Link>
              {' · '}
              <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
                Sign in
              </Link>
            </p>
          </div>
        ) : null}

        {status !== 'success' ? (
          <div className="mt-8 space-y-3">
            <AuthSecondaryButton onClick={() => resend()} disabled={resendBusy || cooldown > 0} loading={resendBusy}>
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
            </AuthSecondaryButton>
            {resendMsg ? (
              <AuthAlert tone={resendTone === 'warning' ? 'warning' : resendTone === 'error' ? 'error' : 'info'}>
                {resendMsg}
              </AuthAlert>
            ) : null}
            <div className="text-center pt-2 space-y-2">
              <Link href="/login" className="block text-[14px] font-medium text-accent hover:text-accent-hover transition-colors">
                Back to sign in
              </Link>
              <p className="text-[12px] text-white/40">
                Wrong place?{' '}
                <Link href="/register" className="text-accent/90 hover:text-accent-hover font-medium">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        ) : null}
      </AuthGlassCard>
      <AuthLegalNote compact />
    </AuthSplitLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-text-muted text-sm auth-brand-fade">
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
