'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const REPORT_TYPES = [
  { value: 'FAKE_PERFORMANCE' as const, label: 'Fake / misleading performance' },
  { value: 'COPYRIGHT' as const, label: 'Copyright concern' },
  { value: 'INAPPROPRIATE' as const, label: 'Inappropriate content' },
  { value: 'OTHER' as const, label: 'Other' },
];

type Props = {
  open: boolean;
  videoId: string;
  title: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function ReportVideoModal({ open, videoId, title, onClose, onSubmitted }: Props) {
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]['value']>('INAPPROPRIATE');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoId,
          reportType,
          details: details.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.message === 'string' ? data.message : 'Could not submit report');
        return;
      }
      onSubmitted();
      onClose();
      setDetails('');
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[275] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-video-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
      />
      <div
        className="relative w-full max-w-[420px] rounded-[20px] border border-white/[0.1] p-6 shadow-2xl max-h-[90dvh] overflow-y-auto"
        style={{ background: 'rgba(14,16,22,0.98)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="report-video-title" className="text-[18px] font-semibold text-white mb-1">
          Report video
        </h2>
        <p className="text-[13px] text-[#9ba7b8] mb-4 line-clamp-2 break-words">{title}</p>
        <label className="block text-[12px] font-medium text-[#cbd5e1] mb-2">Reason</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as (typeof REPORT_TYPES)[number]['value'])}
          className="w-full mb-3 rounded-xl bg-black/40 border border-white/10 text-white text-[14px] px-3 py-2.5"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="block text-[12px] font-medium text-[#cbd5e1] mb-2">Details (optional)</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
          rows={3}
          className="w-full mb-4 rounded-xl bg-black/40 border border-white/10 text-white text-[14px] px-3 py-2.5 resize-none"
          placeholder="Add context for moderators…"
        />
        {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold border border-white/15 text-[#e2e8f0] hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-accent hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
