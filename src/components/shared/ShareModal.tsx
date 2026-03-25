'use client';

import { useState, useEffect } from 'react';
import { IconX, IconClipboard } from '@/components/ui/Icons';

export interface ShareVideoPreview {
  thumbnailUrl?: string;
  creatorName: string;
  country?: string;
  challengeName?: string;
  title: string;
}

export interface ShareTrackResource {
  resourceType: 'video' | 'profile';
  resourceId: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Base share URL. When trackResource is set, fetches URL with ?ref= from API for referral attribution. */
  shareUrl: string;
  preview: ShareVideoPreview;
  subtitle?: string;
  /** When set, share actions (copy / external) are reported to POST /api/share for analytics. */
  trackResource?: ShareTrackResource;
}

const SHARE_TARGETS = [
  { id: 'tiktok', label: 'TikTok', color: '#000' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000' },
  { id: 'instagram', label: 'Instagram', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'x', label: 'X', color: '#000' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { id: 'messenger', label: 'Messenger', color: '#0084FF' },
  { id: 'copy', label: 'Copy Link', color: 'transparent' },
];

async function trackShare(trackResource: ShareTrackResource, shareType: 'copy_link' | 'external') {
  try {
    await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareType,
        resourceType: trackResource.resourceType,
        resourceId: trackResource.resourceId,
      }),
    });
  } catch {
    // best-effort; do not block UI
  }
}

export default function ShareModal({
  isOpen,
  onClose,
  shareUrl: initialShareUrl,
  preview,
  subtitle,
  trackResource,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);

  useEffect(() => {
    if (!isOpen) return;
    if (trackResource) {
      fetch(
        `/api/share/url?resourceType=${encodeURIComponent(trackResource.resourceType)}&resourceId=${encodeURIComponent(trackResource.resourceId)}`
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.shareUrl) setShareUrl(d.shareUrl);
        })
        .catch(() => {});
    } else {
      setShareUrl(initialShareUrl);
    }
  }, [isOpen, trackResource?.resourceType, trackResource?.resourceId, initialShareUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        if (trackResource) await trackShare(trackResource, 'copy_link');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback or insecure context
      setCopied(false);
    }
  };

  const handleShareTarget = (id: string) => {
    if (id === 'copy') {
      handleCopy();
      return;
    }
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(preview.title)}`,
      x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(preview.title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareUrl + ' ' + preview.title)}`,
    };
    const url = urls[id] || `https://www.${id}.com`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    if (trackResource) trackShare(trackResource, 'external');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal - centered desktop, bottom sheet mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="fixed z-50 w-full max-w-[560px] p-5 md:p-6
          left-1/2 -translate-x-1/2
          bottom-0 md:bottom-auto md:top-1/2 translate-y-0 md:-translate-y-1/2
          rounded-t-[24px] md:rounded-[24px]
          max-h-[85vh] md:max-h-[90vh] overflow-y-auto
          border border-[rgba(255,255,255,0.08)]"
        style={{
          background: 'rgba(26,26,28,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >

        {/* 1. Header */}
        <header className="flex items-start justify-between mb-6">
          <div>
            <h2 id="share-modal-title" className="font-display text-[20px] font-semibold text-text-primary">
              Share this performance
            </h2>
            {subtitle && (
              <p className="text-[14px] text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-[12px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors -mr-2"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Video preview block */}
        <div
          className="flex gap-4 p-4 rounded-[20px] mb-6"
          style={{
            background: 'rgba(31,32,36,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="w-24 h-32 rounded-[14px] overflow-hidden bg-canvas-tertiary shrink-0 flex items-center justify-center">
            {preview.thumbnailUrl ? (
              <img src={preview.thumbnailUrl} alt={preview.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🎬</span>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="font-medium text-[13px] text-text-primary truncate">{preview.creatorName}</p>
            {preview.country && <span className="text-[16px] mt-0.5">{preview.country}</span>}
            {preview.challengeName && (
              <p className="text-[13px] text-accent mt-1 truncate">{preview.challengeName}</p>
            )}
            <p className="text-[14px] text-text-secondary mt-1 line-clamp-2">{preview.title}</p>
          </div>
        </div>

        {/* 3. Share targets grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => target.id === 'copy' ? handleCopy() : handleShareTarget(target.id)}
              className="flex flex-col items-center justify-center gap-2 h-[88px] rounded-[18px] transition-all hover:bg-white/5 hover:shadow-[0_0_24px_rgba(255,255,255,0.06)]"
              style={{
                background: 'rgba(31,32,36,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: target.id === 'copy' ? 'rgba(255,255,255,0.12)' : (target.color || 'rgba(255,255,255,0.1)') }}
              >
                {target.id === 'copy' ? (
                  <IconClipboard className="w-5 h-5 text-text-primary" />
                ) : (
                  <span className="text-lg font-bold text-white">{target.label.charAt(0)}</span>
                )}
              </span>
              <span className="text-[13px] font-medium text-text-secondary truncate">{target.label}</span>
            </button>
          ))}
        </div>

        {/* 4. Copy link row */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center h-12 px-4 rounded-[14px] overflow-hidden"
            style={{
              background: 'rgba(31,32,36,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-[14px] text-text-secondary outline-none truncate"
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-2 h-12 px-4 rounded-[14px] font-semibold text-[14px] transition-all shrink-0 ${
              copied
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-accent text-white hover:bg-accent-hover border border-accent'
            }`}
          >
            <IconClipboard className="w-5 h-5" />
            {copied ? 'Link copied' : 'Copy'}
          </button>
        </div>
      </div>

    </>
  );
}
