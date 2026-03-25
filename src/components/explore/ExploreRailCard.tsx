'use client';

import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { CARD_BASE_STYLE } from '@/constants/card-design-system';
import { IconPlay, IconGift } from '@/components/ui/Icons';
import { getFlagEmoji } from '@/lib/countries';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';

export type RailCard = {
  id: string;
  name: string;
  country: string;
  category: string;
  votes?: string;
  views: string;
};

type ExploreRailCardProps = {
  card: RailCard;
  previewUrl?: string | null;
};

export function ExploreRailCard({ card, previewUrl }: ExploreRailCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { openModal } = usePerformanceModal();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openModal(card.id);
    },
    [card.id, openModal]
  );

  const handleGiftClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(card.id, { giftContext: 'foryou', openGiftPanel: true });
    },
    [card.id, openModal]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (videoRef.current && previewUrl) {
      videoRef.current.play().catch(() => {});
    }
  }, [previewUrl]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (videoRef.current && previewUrl) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [previewUrl]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex-shrink-0 w-[180px] min-w-[180px] tablet:min-w-[200px] laptop:min-w-[220px] desktop:min-w-[240px] rounded-[16px] overflow-hidden transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-[#0D0D0E] laptop:hover:-translate-y-0.5 laptop:hover:scale-[1.02] laptop:hover:border-[rgba(255,70,90,0.18)] laptop:hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] text-left"
      style={CARD_BASE_STYLE}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top: thumbnail / video preview area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0c0c0e]">
        {/* Static thumbnail or gradient when no preview */}
        {previewUrl ? (
          <>
            <video
              ref={videoRef}
              src={previewUrl}
              muted
              loop
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden
            />
            <div
              className={`absolute inset-0 bg-gradient-to-b from-[#0c0c0e] via-[#0c0c0e]/90 to-[#0c0c0e] transition-opacity duration-200 ${
                isHovered ? 'opacity-0' : 'opacity-100'
              }`}
              aria-hidden
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0e] via-[#0c0c0e]/90 to-[#0c0c0e] transition-[filter] duration-200 laptop:group-hover:brightness-110" aria-hidden />
        )}

        {/* Center overlay: play icon — fades in on hover (desktop/laptop) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ease-out laptop:opacity-90 laptop:group-hover:opacity-100 laptop:group-hover:scale-110"
            style={{
              background: 'rgba(196,18,47,0.25)',
              border: '1px solid rgba(196,18,47,0.4)',
              boxShadow: '0 0 32px rgba(255, 60, 80, 0.1)',
            }}
          >
            <IconPlay className="w-6 h-6 text-[#c4122f] ml-0.5" aria-hidden />
          </div>
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" aria-hidden />

        {/* Subtle gift entry — opens performance modal on gift */}
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={handleGiftClick}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-black/45 text-white/85 hover:bg-black/60 hover:border-[rgba(196,18,47,0.35)] transition-colors backdrop-blur-sm"
            aria-label="Send a gift"
          >
            <IconGift className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom info: name + flag on one baseline, category below */}
        <div className="absolute bottom-2 left-2 right-2 text-white pointer-events-none min-w-0 overflow-hidden">
          <p className="text-[13px] font-semibold leading-[1.3] truncate flex items-center gap-1.5 min-w-0">
            <span className="truncate min-w-0">{card.name}</span>
            <span className="flex-shrink-0 inline-flex items-center leading-[1.35]" aria-hidden>{getFlagEmoji(card.country)}</span>
          </p>
          <p className="text-[11px] text-white/85 truncate mt-0.5 leading-[1.3]">{card.category}</p>
        </div>
      </div>

      {/* Meta row: votes · views — aligned */}
      <div className="px-3 py-2 border-t border-white/[0.05]">
        <p className="text-[11px] text-[#B7BDC7] leading-[1.3] truncate">
          {card.votes ? `${card.votes} votes · ` : ''}{card.views} views
        </p>
      </div>
    </button>
  );
}
