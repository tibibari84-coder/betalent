'use client';

import { useState } from 'react';

const SUBJECTS = [
  { value: 'general', label: 'General inquiry' },
  { value: 'support', label: 'Technical support' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'privacy', label: 'Privacy / Data' },
  { value: 'other', label: 'Other' },
] as const;

type FormState = 'idle' | 'submitting' | 'success' | 'error' | 'unavailable';

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMeta, setSuccessMeta] = useState<{ delivered: boolean; notice?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMeta(null);
    const fd = new FormData(e.currentTarget);
    const subject = String(fd.get('subject') ?? '');
    const email = String(fd.get('email') ?? '').trim();
    const message = String(fd.get('message') ?? '').trim();

    setFormState('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, email, message }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        delivered?: boolean;
        notice?: string;
      } | null;

      if (res.status === 503 && !data?.ok) {
        setFormState('unavailable');
        setErrorMessage(data?.message ?? 'Contact is not available right now.');
        return;
      }
      if (res.status === 429) {
        setFormState('error');
        setErrorMessage(data?.message ?? 'Too many attempts. Try again later.');
        return;
      }
      if (!res.ok || !data?.ok) {
        setFormState('error');
        setErrorMessage(data?.message ?? 'Could not send. Please try again.');
        return;
      }

      setFormState('success');
      setSuccessMeta({
        delivered: data.delivered !== false,
        notice: data.notice,
      });
    } catch {
      setFormState('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div
      className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24 md:pb-12"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-[560px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <header className="mb-8 md:mb-10">
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-4">
            Contact Us
          </h1>
          <p className="text-[15px] text-text-secondary">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </header>

        {formState === 'success' ? (
          <div className="glass-panel p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-display text-[20px] font-semibold text-text-primary mb-2">
              {successMeta?.delivered === false ? 'Received (development only)' : 'Message sent'}
            </h2>
            <p className="text-[15px] text-text-secondary">
              {successMeta?.delivered === false
                ? successMeta?.notice ??
                  'No email provider is configured. Your message was logged on the server. Set CONTACT_INBOX_EMAIL and RESEND_API_KEY or SENDGRID_API_KEY for real delivery.'
                : "Thank you for reaching out. We'll get back to you as soon as possible."}
            </p>
          </div>
        ) : formState === 'unavailable' ? (
          <div
            className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-5 py-4 text-left"
            role="alert"
          >
            <p className="text-[15px] font-medium text-amber-100/95 mb-1">Contact unavailable</p>
            <p className="text-[14px] text-amber-200/80">
              {errorMessage ??
                'This form is not configured on this server. Please email support directly from your app store listing or legal page, or try again later.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {formState === 'error' && errorMessage && (
              <p className="text-[14px] text-red-300/95" role="alert">
                {errorMessage}
              </p>
            )}
            <div>
              <label htmlFor="subject" className="block text-[13px] font-semibold text-text-primary mb-2">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                required
                disabled={formState === 'submitting'}
                className="w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px]"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-text-primary mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={formState === 'submitting'}
                placeholder="you@example.com"
                className="w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px]"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-[13px] font-semibold text-text-primary mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                disabled={formState === 'submitting'}
                rows={5}
                placeholder="How can we help?"
                className="w-full min-h-[120px] px-4 py-3 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="btn-primary w-full min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {formState === 'submitting' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
