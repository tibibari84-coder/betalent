'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GiftAnimationConfig, AnimationScope, GiftCelebrationTier } from '@/types/gift-animation';

interface GiftCelebrationProps {
  config: GiftAnimationConfig;
  scopeContext: AnimationScope;
  onComplete?: () => void;
  className?: string;
  comboCount?: number;
  senderAvatarUrl?: string | null;
  senderName?: string;
  tier?: GiftCelebrationTier;
  giftLabel?: string;
}

const TIER_STYLES: Record<GiftCelebrationTier, { glow: string; accent: string; panel: string }> = {
  bronze: {
    glow: 'radial-gradient(circle, rgba(214,127,84,0.38) 0%, rgba(214,127,84,0.12) 45%, transparent 72%)',
    accent: '#e6a06f',
    panel: 'linear-gradient(135deg, rgba(165,94,61,0.35), rgba(80,44,31,0.25))',
  },
  silver: {
    glow: 'radial-gradient(circle, rgba(196,208,224,0.4) 0%, rgba(196,208,224,0.14) 45%, transparent 72%)',
    accent: '#d4dfef',
    panel: 'linear-gradient(135deg, rgba(146,163,186,0.38), rgba(89,100,117,0.24))',
  },
  gold: {
    glow: 'radial-gradient(circle, rgba(245,201,109,0.42) 0%, rgba(245,201,109,0.16) 45%, transparent 74%)',
    accent: '#ffd56f',
    panel: 'linear-gradient(135deg, rgba(232,170,47,0.4), rgba(123,87,18,0.24))',
  },
  diamond: {
    glow: 'radial-gradient(circle, rgba(98,220,255,0.45) 0%, rgba(98,220,255,0.18) 45%, transparent 76%)',
    accent: '#7be7ff',
    panel: 'linear-gradient(135deg, rgba(63,203,246,0.42), rgba(39,104,164,0.28))',
  },
};

function random(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function GiftCelebration({
  config,
  scopeContext,
  onComplete,
  className = '',
  comboCount = 1,
  senderAvatarUrl,
  senderName,
  tier = 'bronze',
  giftLabel = 'Gift',
}: GiftCelebrationProps) {
  const allowed = config.scope.includes(scopeContext);
  const duration = config.durationMs ?? (config.intensity === 'legendary' ? 2800 : 1800);
  const style = TIER_STYLES[tier];
  const particles = useMemo(
    () =>
      Array.from({ length: tier === 'diamond' ? 52 : tier === 'gold' ? 40 : tier === 'silver' ? 30 : 22 }).map(
        (_, i) => {
          const seed = i * 12.9898 + duration;
          const spread = (random(seed) - 0.5) * 420;
          const rise = 100 + random(seed + 0.21) * 260;
          const startX = (random(seed + 0.4) - 0.5) * 160;
          const delay = random(seed + 0.8) * 0.18;
          const size = 3 + Math.round(random(seed + 0.93) * 4);
          const rotate = (random(seed + 1.1) - 0.5) * 500;
          return { i, spread, rise, startX, delay, size, rotate };
        }
      ),
    [tier, duration]
  );

  if (!allowed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`gift-celebration gift-celebration--${config.animationType} gift-celebration--${config.intensity} ${className}`}
        data-animation-type={config.animationType}
        data-intensity={config.intensity}
        data-scope={scopeContext}
        role="img"
        aria-hidden="true"
        style={{ ['--gift-duration-ms' as string]: `${duration}ms` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: style.glow }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: [0, 1, 0.2], scale: [0.92, 1.06, 1.14] }}
          transition={{ duration: duration / 1000, times: [0, 0.35, 1], ease: 'easeOut' }}
        />

        <motion.div
          className="absolute left-1/2 top-[44%] w-[76vw] max-w-[520px] h-[220px] rounded-[28px]"
          style={{
            transform: 'translate(-50%, -50%)',
            background: style.panel,
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 120px ${style.accent}33`,
            backdropFilter: 'blur(9px)',
          }}
          initial={{ opacity: 0, y: 28, scale: 0.92, rotateX: 24 }}
          animate={{ opacity: [0, 1, 1, 0], y: [28, 0, -2, -18], scale: [0.92, 1.02, 1, 0.98], rotateX: [24, 0, 0, 0] }}
          transition={{ duration: duration / 1000, times: [0, 0.18, 0.8, 1], ease: 'easeOut' }}
        />

        {particles.map((p) => (
          <motion.span
            key={p.i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: p.i % 3 === 0 ? style.accent : 'rgba(255,255,255,0.95)',
              boxShadow: `0 0 10px ${style.accent}88`,
            }}
            initial={{ x: p.startX, y: 12, opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ x: p.startX + p.spread, y: -p.rise, opacity: [0, 1, 0], scale: [0.6, 1, 0.7], rotate: p.rotate }}
            transition={{ duration: 1.25 + p.delay, ease: 'easeOut', delay: p.delay }}
          />
        ))}

        <motion.div
          className="absolute left-[-56px] top-[55%] w-14 h-14 rounded-full overflow-hidden border border-white/30"
          style={{
            background:
              'radial-gradient(circle at 35% 18%, rgba(255,255,255,0.6), rgba(255,255,255,0.12)), rgba(15,15,20,0.88)',
            boxShadow: `0 8px 26px rgba(0,0,0,0.35), 0 0 34px ${style.accent}44`,
          }}
          initial={{ x: -40, y: 30, opacity: 0, scale: 0.8, rotate: -18 }}
          animate={{ x: ['0vw', '42vw', '92vw'], y: [24, -35, -70], opacity: [0, 1, 0], scale: [0.8, 1.06, 0.82], rotate: [-18, 0, 12] }}
          transition={{ duration: duration / 1000, times: [0, 0.35, 1], ease: 'easeInOut' }}
        >
          {senderAvatarUrl ? (
            <img src={senderAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              {(senderName || 'U').slice(0, 1).toUpperCase()}
            </span>
          )}
        </motion.div>

        <motion.div
          className="absolute left-1/2 top-[46%] -translate-x-1/2 px-6 py-3 rounded-[16px] text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(12,12,16,0.58), rgba(12,12,16,0.34))',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          initial={{ opacity: 0, scale: 0.84, y: 14 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.84, 1.05, 1, 0.9], y: [14, 0, 0, -8] }}
          transition={{ duration: duration / 1000, times: [0, 0.2, 0.82, 1], ease: 'easeOut' }}
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">Gift Boost</p>
          <p className="text-[20px] md:text-[24px] font-semibold text-white mt-1">{giftLabel}</p>
          {comboCount > 1 ? (
            <motion.p
              className="mt-1 text-[13px] font-bold"
              style={{ color: style.accent }}
              animate={{ scale: [1, 1.22, 1], opacity: [0.85, 1, 0.92] }}
              transition={{ repeat: 3, duration: 0.4, ease: 'easeInOut' }}
            >
              X{comboCount} Gifts!
            </motion.p>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
