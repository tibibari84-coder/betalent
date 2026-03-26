'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/components/ui/Icons';

/** Above Navbar profile dropdown (z-300) so overlay and close controls receive clicks. */
const MODAL_Z = 400;

const OUTPUT_SIZE = 512;
const CROP_PX = 280;

type AvatarCropModalProps = {
  imageSrc: string;
  onCancel: () => void;
  /** PNG blob, square 512×512, circular alpha mask */
  onComplete: (blob: Blob) => void;
};

/**
 * Facebook-style avatar crop: image always **covers** the circle (no zoom control).
 * User only **drags** to choose the visible area. Pan is clamped so there are no empty gaps.
 */
export default function AvatarCropModal({ imageSrc, onCancel, onComplete }: AvatarCropModalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setNatural({ w: 1, h: 1 });
  }, [imageSrc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  /** Scale so the image covers the CROP_PX square (same idea as object-fit: cover). */
  const coverScale =
    natural.w > 0 && natural.h > 0 ? Math.max(CROP_PX / natural.w, CROP_PX / natural.h) : 1;
  const dispW = natural.w * coverScale;
  const dispH = natural.h * coverScale;

  const maxPanX = Math.max(0, (dispW - CROP_PX) / 2);
  const maxPanY = Math.max(0, (dispH - CROP_PX) / 2);

  const clampPan = useCallback(
    (x: number, y: number) => ({
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    }),
    [maxPanX, maxPanY]
  );

  useEffect(() => {
    setPan((p) => clampPan(p.x, p.y));
  }, [natural.w, natural.h, clampPan]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    setNatural({ w: im.naturalWidth, h: im.naturalHeight });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    const next = clampPan(d.px + (e.clientX - d.sx), d.py + (e.clientY - d.sy));
    setPan(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleSave = useCallback(() => {
    const img = imgRef.current;
    const vp = viewportRef.current;
    if (!img || !vp || !img.complete || natural.w < 2) return;

    const ir = img.getBoundingClientRect();
    const vr = vp.getBoundingClientRect();
    const scaleX = img.naturalWidth / ir.width;
    const scaleY = img.naturalHeight / ir.height;
    const sx = (vr.left - ir.left) * scaleX;
    const sy = (vr.top - ir.top) * scaleY;
    const sw = vr.width * scaleX;
    const sh = vr.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (b) => {
        if (b) onComplete(b);
      },
      'image/png',
      0.92
    );
  }, [natural.w, onComplete]);

  const overlay = (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/85 backdrop-blur-md p-4 sm:p-6"
      style={{ zIndex: MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      onClick={onCancel}
    >
      <div
        className="my-auto w-full max-w-[min(100%,420px)] rounded-2xl border border-white/[0.1] bg-[#101012] shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col max-h-[min(100vh-2rem,calc(100dvh-2rem))] min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 id="avatar-crop-title" className="text-[16px] font-semibold text-white">
            Profile photo
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5 flex flex-col items-center gap-4">
          <p className="text-[13px] text-white/60 text-center leading-relaxed max-w-[320px]">
            Drag the photo to choose what appears in your profile picture. The circle matches what will be saved.
          </p>

          <div
            ref={viewportRef}
            className="relative shrink-0 overflow-hidden bg-[#1a1a1c] touch-none select-none ring-2 ring-white/25 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
            style={{
              width: CROP_PX,
              height: CROP_PX,
              clipPath: 'circle(50% at 50% 50%)',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              className="absolute max-w-none max-h-none pointer-events-none"
              style={{
                width: dispW,
                height: dispH,
                left: (CROP_PX - dispW) / 2 + pan.x,
                top: (CROP_PX - dispH) / 2 + pan.y,
              }}
            />
          </div>

          <p className="text-[12px] text-white/45 text-center">
            Output: 512 × 512 PNG with a circular crop.
          </p>
        </div>

        <div className="shrink-0 flex gap-3 px-4 py-4 border-t border-white/[0.06] bg-[#0c0c0e]">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1 min-h-[48px]">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1 min-h-[48px]">
            Save
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(overlay, document.body);
}
