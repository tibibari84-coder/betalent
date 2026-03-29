'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { IconEye, IconEyeOff } from '@/components/ui/Icons';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { ROUTES } from '@/constants/app';
import { evaluatePasswordStrength } from '@/lib/auth-password-strength';
import { cn } from '@/lib/utils';

/** Premium brand lockup — editorial, not nav chrome */
function AuthBrandLockup({ align = 'center' }: { align?: 'center' | 'start' }) {
  return (
    <div className={cn('flex flex-col', align === 'start' ? 'items-start' : 'items-center')}>
      <BrandWordmark
        variant="auth"
        className="text-[clamp(1.2rem,4.5vw,1.65rem)] tracking-[0.22em] text-white/[0.96]"
        style={{ textShadow: '0 0 40px rgba(196,18,47,0.12)' }}
      />
      <div
        className={cn(
          'mt-4 h-px bg-gradient-to-r to-transparent',
          align === 'start'
            ? 'w-16 from-[rgba(196,18,47,0.45)] via-white/15'
            : 'w-11 from-transparent via-white/25'
        )}
        aria-hidden
      />
    </div>
  );
}

/** Desktop brand column + mobile headline strip + form column */
export function AuthSplitLayout({
  brandEyebrow,
  brandTitle,
  brandSubtitle,
  brandFooter,
  mobileTagline,
  children,
}: {
  brandEyebrow: string;
  brandTitle: ReactNode;
  brandSubtitle: string;
  brandFooter?: ReactNode;
  /** One short line under logo on mobile */
  mobileTagline: string;
  children: ReactNode;
}) {
  return (
    <>
      {/* Mobile: brand statement above hero line — no navbar, cinematic entry */}
      <div className="lg:hidden w-full flex justify-center px-2 pt-1 pb-2 auth-brand-fade">
        <AuthBrandLockup align="center" />
      </div>

      <section
        className="hidden lg:flex flex-1 flex-col justify-center min-w-0 pr-4 xl:pr-12 auth-brand-fade"
        aria-hidden={false}
      >
        <div className="max-w-[min(100%,26rem)] xl:max-w-lg space-y-7 xl:space-y-8">
          <AuthBrandLockup align="start" />
          <p className="text-[10px] xl:text-[11px] tracking-[0.32em] uppercase text-white/38 font-medium pt-1">{brandEyebrow}</p>
          <div className="font-display text-[clamp(2.125rem,3.4vw,3.5rem)] leading-[1.02] tracking-[-0.04em] text-text-primary">
            {brandTitle}
          </div>
          <p className="text-[15px] xl:text-[16px] leading-[1.55] text-text-secondary/90 max-w-md font-normal">{brandSubtitle}</p>
          {brandFooter ? <div className="text-[12px] leading-relaxed text-white/36 max-w-md pt-1">{brandFooter}</div> : null}
        </div>
      </section>

      <section className="lg:hidden w-full max-w-[min(100%,28rem)] mx-auto text-center px-2 pb-2 auth-brand-fade">
        <p className="text-[13px] sm:text-[14px] text-text-secondary/88 leading-snug tracking-tight">{mobileTagline}</p>
      </section>

      <section className="flex-1 flex items-start lg:items-center justify-center min-w-0 w-full pb-6 sm:pb-8 lg:pb-0">
        <div className="w-full max-w-[min(100%,28rem)]">{children}</div>
      </section>
    </>
  );
}

/** Glass auth card with subtle entry motion */
export function AuthGlassCard({
  children,
  className = '',
  scrollable,
}: {
  children: ReactNode;
  className?: string;
  /** Long forms (register): constrain height and scroll inside card */
  scrollable?: boolean;
}) {
  return (
    <div
      className={`relative w-full rounded-[24px] border border-white/[0.07] bg-[rgba(6,6,8,0.58)] backdrop-blur-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.55),0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden auth-card-enter ${scrollable ? 'max-h-[min(88vh,880px)] flex flex-col' : ''} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-[-35%] top-[-50%] h-[min(240px,52vw)] opacity-[0.42]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 20% 0%, rgba(196,18,47,0.28), transparent 68%), radial-gradient(ellipse 65% 45% at 92% 8%, rgba(196,18,47,0.1), transparent 58%)',
        }}
      />
      <div
        className={`relative z-[1] px-5 sm:px-8 py-7 sm:py-8 ${scrollable ? 'overflow-y-auto overscroll-contain min-h-0 flex-1' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthCardHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-6 sm:mb-7 space-y-1.5 sm:space-y-2">
      <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-white/36 font-medium">{eyebrow}</p>
      <h1 className="font-display text-[1.7rem] sm:text-[1.95rem] font-semibold text-text-primary tracking-[-0.038em] leading-[1.08]">
        {title}
      </h1>
      <p className="text-[13.5px] sm:text-[14px] leading-[1.5] text-text-secondary/88">{subtitle}</p>
    </header>
  );
}

export function AuthDivider() {
  const { t } = useI18n();
  return (
    <div className="relative flex items-center gap-4 py-1" role="separator">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-medium shrink-0">{t('auth.orDivider')}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
    </div>
  );
}

export function GoogleContinueButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="/api/auth/google"
      className={`google-btn relative z-[2] group w-full flex items-center justify-center gap-2.5 min-h-[48px] rounded-[15px] border border-white/[0.09] bg-white/[0.035] text-[14px] font-medium text-text-primary/95 hover:bg-white/[0.07] hover:border-white/[0.14] active:scale-[0.99] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,18,47,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708] ${className}`}
    >
      <svg className="w-[18px] h-[18px] shrink-0 opacity-90 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </a>
  );
}

const inputBase =
  'w-full min-h-[48px] px-4 rounded-[14px] bg-black/35 border text-[15px] text-text-primary placeholder:text-white/30 transition-all duration-200';
const inputNormal = 'border-white/[0.08] focus:border-[rgba(196,18,47,0.45)] focus:ring-2 focus:ring-[rgba(196,18,47,0.2)] focus:outline-none';
const inputError = 'border-red-500/40 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/15';

export function AuthTextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-white/75">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={`${inputBase} ${error ? inputError : inputNormal}`}
      />
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-red-400/95 leading-snug" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-white/40 leading-snug">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  placeholder = '••••••••••••',
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-[13px] font-medium text-white/75">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputBase} pr-12 ${error ? inputError : inputNormal}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/45 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-red-400/95 leading-snug" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const alertStyles: Record<AlertTone, string> = {
  error: 'border-red-500/25 bg-red-500/[0.08] text-red-200/95',
  success: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200/95',
  info: 'border-sky-500/20 bg-sky-500/[0.07] text-sky-100/90',
  warning: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-100/90',
};

export function AuthAlert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[14px] border px-4 py-3 text-[13px] leading-relaxed ${alertStyles[tone]}`}
    >
      {children}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  disabled,
  type = 'submit',
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="w-full min-h-[48px] rounded-[14px] font-semibold text-[15px] tracking-wide text-white bg-gradient-to-b from-[#d41936] to-[#9b0e24] border border-white/10 shadow-[0_0_0_1px_rgba(196,18,47,0.35),0_8px_28px_rgba(196,18,47,0.28)] hover:from-[#e01e3d] hover:to-[#b01028] hover:shadow-[0_0_0_1px_rgba(196,18,47,0.5),0_10px_32px_rgba(196,18,47,0.35)] active:scale-[0.99] transition-all duration-200 disabled:opacity-45 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,18,47,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0e]"
    >
      {loading ? <span className="inline-flex items-center gap-2 justify-center">Working…</span> : children}
    </button>
  );
}

export function AuthSecondaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full min-h-[48px] rounded-[14px] text-[14px] font-medium border border-white/[0.12] bg-white/[0.04] text-text-primary hover:bg-white/[0.08] transition-all duration-200 disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function AuthSuccessMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/[0.12] shadow-[0_0_24px_rgba(16,185,129,0.15)] ${className}`}
      aria-hidden
    >
      <svg className="w-7 h-7 text-emerald-400/95" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export function AuthTrustStrip() {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-black/20 px-3.5 py-2.5 mt-1">
      <p className="text-[11px] leading-snug text-white/45">
        Session is a sealed server cookie · Email verification confirms inbox access only
      </p>
    </div>
  );
}

export function AuthLegalNote({ compact }: { compact?: boolean }) {
  return (
    <p className={`text-center text-white/32 leading-snug ${compact ? 'text-[10px] mt-4 sm:mt-5' : 'text-[11px] mt-5 sm:mt-6'} max-w-[300px] mx-auto`}>
      By continuing you accept our{' '}
      <Link href={ROUTES.LEGAL_TERMS} className="text-white/55 hover:text-accent/90 underline underline-offset-2">
        Terms
      </Link>
      {' · '}
      <Link href={ROUTES.FAIR_PLAY} className="text-white/55 hover:text-accent/90 underline underline-offset-2">
        Fair Play
      </Link>
      {' · '}
      <Link href={ROUTES.CONTENT_POLICY} className="text-white/55 hover:text-accent/90 underline underline-offset-2">
        Content
      </Link>
    </p>
  );
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, checks } = evaluatePasswordStrength(password);
  const pct = (score / 5) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/35 font-medium">Password strength</span>
        <span className="text-[12px] text-white/55">{label}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background:
              score <= 1
                ? 'linear-gradient(90deg, #7f1d1d, #b91c1c)'
                : score === 2
                  ? 'linear-gradient(90deg, #b45309, #d97706)'
                  : score <= 4
                    ? 'linear-gradient(90deg, #c4122f, #e11d48)'
                    : 'linear-gradient(90deg, #059669, #10b981)',
          }}
        />
      </div>
      <ul className="grid grid-cols-1 gap-1">
        {checks.map((c) => (
          <li key={c.id} className={`text-[12px] flex items-center gap-2 ${c.ok ? 'text-emerald-400/80' : 'text-white/35'}`}>
            <span className="w-1 h-1 rounded-full shrink-0 bg-current opacity-80" aria-hidden />
            {c.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
