'use client';

import { useState } from 'react';
import { IconFlag, IconX } from '@/components/ui/Icons';
import { CONTENT_REPORT_TYPE_LABELS, CONTENT_REPORT_TYPE_DESCRIPTIONS } from '@/constants/content-report';
import type { ContentReportTypeKey } from '@/constants/content-report';

interface ReportModalProps {
  videoId: string;
  videoTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportModal({ videoId, videoTitle, isOpen, onClose, onSuccess }: ReportModalProps) {
  const [reportType, setReportType] = useState<ContentReportTypeKey>('FAKE_PERFORMANCE');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          reportType,
          details: details.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setMessage({ type: 'error', text: 'Please log in to report.' });
        return;
      }
      if (data.ok) {
        setMessage({ type: 'success', text: data.message ?? 'Report submitted. Our team will review it.' });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Could not submit report.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReportType('FAKE_PERFORMANCE');
      setDetails('');
      setMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] p-6"
        style={{ background: '#141416', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <IconFlag className="w-5 h-5 text-accent" />
            <h2 className="font-display text-[18px] font-semibold text-text-primary">Report performance</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {videoTitle && (
          <p className="text-[13px] text-text-muted mb-4 line-clamp-2">"{videoTitle}"</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-2">Reason</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ContentReportTypeKey)}
              className="w-full h-12 px-4 rounded-xl bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              disabled={loading}
            >
              {(['FAKE_PERFORMANCE', 'COPYRIGHT', 'INAPPROPRIATE', 'OTHER'] as const).map((k) => (
                <option key={k} value={k}>{CONTENT_REPORT_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <p className="text-[12px] text-text-muted mt-1">{CONTENT_REPORT_TYPE_DESCRIPTIONS[reportType]}</p>
          </div>

          <div>
            <label htmlFor="report-details" className="block text-[13px] font-medium text-text-secondary mb-2">Additional details (optional)</label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Help us understand the issue..."
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
              disabled={loading}
            />
          </div>

          {message && (
            <p className={`text-[13px] ${message.type === 'success' ? 'text-green-400' : 'text-accent'}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 text-text-secondary hover:bg-white/5 transition-colors text-[14px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-[14px] hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
