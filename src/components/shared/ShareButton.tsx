'use client';

import { useState, cloneElement, isValidElement } from 'react';
import { IconShare } from '@/components/ui/Icons';
import ShareModal, { type ShareVideoPreview, type ShareTrackResource } from './ShareModal';

export interface ShareButtonProps {
  shareUrl: string;
  preview: ShareVideoPreview;
  /** When set, share actions are reported to POST /api/share. */
  trackResource?: ShareTrackResource;
  subtitle?: string;
  /** Custom trigger (single element). If not provided, renders default icon + "Share" button. */
  children?: React.ReactNode;
  className?: string;
  /** Use when inside a clickable parent (e.g. card) to avoid navigation. */
  stopPropagation?: boolean;
  'aria-label'?: string;
}

/**
 * Reusable share trigger that opens ShareModal. Use for video or profile share.
 * Copy link works with "Link copied" feedback; external share is tracked when trackResource is set.
 */
export default function ShareButton({
  shareUrl,
  preview,
  trackResource,
  subtitle,
  children,
  className = '',
  stopPropagation = false,
  'aria-label': ariaLabel = 'Share',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(true);
  };

  const trigger =
    children && isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
          onClick: (e: React.MouseEvent) => {
            (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props?.onClick?.(e);
            handleClick(e);
          },
        })
      : (
          <button
            type="button"
            onClick={handleClick}
            className={className}
            aria-label={ariaLabel}
          >
            <IconShare className="w-5 h-5" />
            <span className="text-[14px] font-medium">Share</span>
          </button>
        );

  return (
    <>
      {trigger}
      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        shareUrl={shareUrl}
        preview={preview}
        subtitle={subtitle}
        trackResource={trackResource}
      />
    </>
  );
}
