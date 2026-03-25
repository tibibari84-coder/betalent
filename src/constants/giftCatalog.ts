/**
 * BETALENT Gift Catalog
 * Curated premium fan-support collection. Music, stage, performance themed.
 * Cinematic, not childish. Single source of truth for display and seed.
 *
 * Rarity tiers (coin ranges):
 *   COMMON: 10–40
 *   RARE: 40–80
 *   EPIC: 80–150
 *   LEGENDARY: 150–300
 *   MYTHIC: 300+
 */

export type GiftRarityTier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface GiftCatalogEntry {
  name: string;
  slug: string;
  icon: string;
  animationType: string;
  coinCost: number;
  rarityTier: GiftRarityTier;
}

export const GIFT_RARITY_TIERS: Record<GiftRarityTier, { label: string; order: number }> = {
  COMMON: { label: 'Common', order: 1 },
  RARE: { label: 'Rare', order: 2 },
  EPIC: { label: 'Epic', order: 3 },
  LEGENDARY: { label: 'Legendary', order: 4 },
  MYTHIC: { label: 'Mythic', order: 5 },
};

/** Curated premium gift catalog – 50+ music & performance themed gifts */
export const GIFT_CATALOG: GiftCatalogEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // COMMON (10–40 coins) – Entry-level support, applause, light gestures
  // ═══════════════════════════════════════════════════════════════
  { name: 'Music Note', slug: 'music-note', icon: 'music-note', animationType: 'float', coinCost: 10, rarityTier: 'COMMON' },
  { name: 'Clap', slug: 'clap', icon: 'clap', animationType: 'float', coinCost: 10, rarityTier: 'COMMON' },
  { name: 'Applause', slug: 'applause', icon: 'applause', animationType: 'float', coinCost: 12, rarityTier: 'COMMON' },
  { name: 'Star', slug: 'star', icon: 'star', animationType: 'sparkle', coinCost: 12, rarityTier: 'COMMON' },
  { name: 'Rose', slug: 'rose', icon: 'rose', animationType: 'float', coinCost: 15, rarityTier: 'COMMON' },
  { name: 'Heart', slug: 'heart', icon: 'heart', animationType: 'pulse', coinCost: 15, rarityTier: 'COMMON' },
  { name: 'Wave', slug: 'wave', icon: 'wave', animationType: 'float', coinCost: 18, rarityTier: 'COMMON' },
  { name: 'Thumbs Up', slug: 'thumbs-up', icon: 'thumbs-up', animationType: 'float', coinCost: 18, rarityTier: 'COMMON' },
  { name: 'Ticket', slug: 'ticket', icon: 'ticket', animationType: 'float', coinCost: 20, rarityTier: 'COMMON' },
  { name: 'Fire', slug: 'fire', icon: 'fire', animationType: 'pulse', coinCost: 22, rarityTier: 'COMMON' },
  { name: 'Microphone', slug: 'microphone', icon: 'microphone', animationType: 'spotlight', coinCost: 25, rarityTier: 'COMMON' },
  { name: 'Spotlight', slug: 'spotlight', icon: 'spotlight', animationType: 'spotlight', coinCost: 25, rarityTier: 'COMMON' },
  { name: 'Bouquet', slug: 'bouquet', icon: 'bouquet', animationType: 'float', coinCost: 28, rarityTier: 'COMMON' },
  { name: 'Crown', slug: 'crown', icon: 'crown', animationType: 'shine', coinCost: 30, rarityTier: 'COMMON' },
  { name: 'Standing Ovation', slug: 'standing-ovation', icon: 'standing-ovation', animationType: 'bounce', coinCost: 32, rarityTier: 'COMMON' },
  { name: 'Stage Hand', slug: 'stage-hand', icon: 'stage-hand', animationType: 'float', coinCost: 35, rarityTier: 'COMMON' },
  { name: 'Bravo', slug: 'bravo', icon: 'bravo', animationType: 'float', coinCost: 40, rarityTier: 'COMMON' },

  // ═══════════════════════════════════════════════════════════════
  // RARE (40–80 coins) – Instruments, stage lights, vinyl
  // ═══════════════════════════════════════════════════════════════
  { name: 'Treble Clef', slug: 'treble-clef', icon: 'treble-clef', animationType: 'float', coinCost: 40, rarityTier: 'RARE' },
  { name: 'Bass Clef', slug: 'bass-clef', icon: 'bass-clef', animationType: 'float', coinCost: 45, rarityTier: 'RARE' },
  { name: 'Metronome', slug: 'metronome', icon: 'metronome', animationType: 'bounce', coinCost: 50, rarityTier: 'RARE' },
  { name: 'Sheet Music', slug: 'sheet-music', icon: 'sheet-music', animationType: 'float', coinCost: 50, rarityTier: 'RARE' },
  { name: 'Headphones', slug: 'headphones', icon: 'headphones', animationType: 'pulse', coinCost: 55, rarityTier: 'RARE' },
  { name: 'Stage Lights', slug: 'stage-lights', icon: 'stage-lights', animationType: 'spotlight', coinCost: 60, rarityTier: 'RARE' },
  { name: 'Follow Spot', slug: 'follow-spot', icon: 'follow-spot', animationType: 'spotlight', coinCost: 65, rarityTier: 'RARE' },
  { name: 'Vinyl', slug: 'vinyl', icon: 'vinyl', animationType: 'float', coinCost: 70, rarityTier: 'RARE' },
  { name: 'Guitar', slug: 'guitar', icon: 'guitar', animationType: 'pulse', coinCost: 72, rarityTier: 'RARE' },
  { name: 'Violin', slug: 'violin', icon: 'violin', animationType: 'float', coinCost: 75, rarityTier: 'RARE' },
  { name: 'Saxophone', slug: 'saxophone', icon: 'saxophone', animationType: 'pulse', coinCost: 78, rarityTier: 'RARE' },
  { name: 'Gramophone', slug: 'gramophone', icon: 'gramophone', animationType: 'pulse', coinCost: 80, rarityTier: 'RARE' },

  // ═══════════════════════════════════════════════════════════════
  // EPIC (80–150 coins) – Drum, spotlight pro, encore, curtain call
  // ═══════════════════════════════════════════════════════════════
  { name: 'Drum Beat', slug: 'drum-beat', icon: 'drum', animationType: 'bounce', coinCost: 85, rarityTier: 'EPIC' },
  { name: 'Spotlight Pro', slug: 'spotlight-pro', icon: 'spotlight-pro', animationType: 'spotlight', coinCost: 90, rarityTier: 'EPIC' },
  { name: 'Encore', slug: 'encore', icon: 'encore', animationType: 'bounce', coinCost: 95, rarityTier: 'EPIC' },
  { name: 'Curtain Call', slug: 'curtain-call', icon: 'curtain-call', animationType: 'luminous-panel', coinCost: 100, rarityTier: 'EPIC' },
  { name: 'Conductor Baton', slug: 'conductor-baton', icon: 'conductor-baton', animationType: 'float', coinCost: 105, rarityTier: 'EPIC' },
  { name: 'Diamond Star', slug: 'diamond-star', icon: 'diamond-star', animationType: 'shine', coinCost: 110, rarityTier: 'EPIC' },
  { name: 'Golden Mic', slug: 'golden-mic', icon: 'golden-mic', animationType: 'shine', coinCost: 120, rarityTier: 'EPIC' },
  { name: 'Thunderous Applause', slug: 'thunderous-applause', icon: 'thunderous-applause', animationType: 'bounce', coinCost: 130, rarityTier: 'EPIC' },
  { name: 'Rising Star', slug: 'rising-star', icon: 'rising-star', animationType: 'shine', coinCost: 140, rarityTier: 'EPIC' },
  { name: 'Piano', slug: 'piano', icon: 'piano', animationType: 'luminous-panel', coinCost: 150, rarityTier: 'EPIC' },

  // ═══════════════════════════════════════════════════════════════
  // LEGENDARY (150–300 coins) – Records, awards, grand instruments
  // ═══════════════════════════════════════════════════════════════
  { name: 'Medal', slug: 'medal', icon: 'medal', animationType: 'shine', coinCost: 170, rarityTier: 'LEGENDARY' },
  { name: 'Silver Record', slug: 'silver-record', icon: 'silver-record', animationType: 'shine', coinCost: 200, rarityTier: 'LEGENDARY' },
  { name: 'Trophy', slug: 'trophy', icon: 'trophy', animationType: 'luminous-panel', coinCost: 220, rarityTier: 'LEGENDARY' },
  { name: 'Crystal Ball', slug: 'crystal-ball', icon: 'crystal-ball', animationType: 'luminous-panel', coinCost: 250, rarityTier: 'LEGENDARY' },
  { name: 'Gold Record', slug: 'gold-record', icon: 'gold-record', animationType: 'shine', coinCost: 270, rarityTier: 'LEGENDARY' },
  { name: 'Red Carpet', slug: 'red-carpet', icon: 'red-carpet', animationType: 'luminous-panel', coinCost: 280, rarityTier: 'LEGENDARY' },
  { name: 'Grammy', slug: 'grammy', icon: 'grammy', animationType: 'luminous-panel', coinCost: 290, rarityTier: 'LEGENDARY' },
  { name: 'Spotlight Elite', slug: 'spotlight-elite', icon: 'spotlight-elite', animationType: 'legendary', coinCost: 300, rarityTier: 'LEGENDARY' },
  { name: 'Grand Piano', slug: 'grand-piano', icon: 'grand-piano', animationType: 'luminous-panel', coinCost: 300, rarityTier: 'LEGENDARY' },
  { name: 'Oscar', slug: 'oscar', icon: 'oscar', animationType: 'shine', coinCost: 300, rarityTier: 'LEGENDARY' },
  { name: 'Golden Score', slug: 'golden-score', icon: 'golden-score', animationType: 'shine', coinCost: 300, rarityTier: 'LEGENDARY' },
  { name: 'VIP Pass', slug: 'vip-pass', icon: 'vip-pass', animationType: 'luminous-panel', coinCost: 250, rarityTier: 'LEGENDARY' },
  { name: 'Backstage Pass', slug: 'backstage-pass', icon: 'backstage-pass', animationType: 'luminous-panel', coinCost: 280, rarityTier: 'LEGENDARY' },

  // ═══════════════════════════════════════════════════════════════
  // MYTHIC (300+ coins) – Peak tier, hall of fame
  // ═══════════════════════════════════════════════════════════════
  { name: 'Diamond', slug: 'diamond', icon: 'diamond', animationType: 'shine', coinCost: 350, rarityTier: 'MYTHIC' },
  { name: 'Star Burst', slug: 'star-burst', icon: 'star-burst', animationType: 'shine', coinCost: 400, rarityTier: 'MYTHIC' },
  { name: 'Ultimate Support', slug: 'ultimate-support', icon: 'ultimate-support', animationType: 'legendary', coinCost: 450, rarityTier: 'MYTHIC' },
  { name: 'Platinum Record', slug: 'platinum-record', icon: 'platinum-record', animationType: 'legendary', coinCost: 500, rarityTier: 'MYTHIC' },
  { name: 'BETALENT Crown', slug: 'betalent-crown', icon: 'betalent-crown', animationType: 'legendary', coinCost: 600, rarityTier: 'MYTHIC' },
  { name: 'Champion', slug: 'champion', icon: 'champion', animationType: 'legendary', coinCost: 750, rarityTier: 'MYTHIC' },
  { name: 'Diamond Record', slug: 'diamond-record', icon: 'diamond-record', animationType: 'legendary', coinCost: 800, rarityTier: 'MYTHIC' },
  { name: 'Icon', slug: 'icon', icon: 'icon', animationType: 'legendary', coinCost: 900, rarityTier: 'MYTHIC' },
  { name: 'Legend', slug: 'legend', icon: 'legend', animationType: 'legendary', coinCost: 1000, rarityTier: 'MYTHIC' },
  { name: 'Hall of Fame', slug: 'hall-of-fame', icon: 'hall-of-fame', animationType: 'legendary', coinCost: 1200, rarityTier: 'MYTHIC' },
  { name: 'Mogul', slug: 'mogul', icon: 'mogul', animationType: 'legendary', coinCost: 1500, rarityTier: 'MYTHIC' },
  { name: 'Superstar', slug: 'superstar', icon: 'superstar', animationType: 'legendary', coinCost: 2000, rarityTier: 'MYTHIC' },
  { name: 'Supernova', slug: 'supernova', icon: 'supernova', animationType: 'legendary', coinCost: 2500, rarityTier: 'MYTHIC' },
  { name: 'Double Platinum', slug: 'double-platinum', icon: 'double-platinum', animationType: 'legendary', coinCost: 3000, rarityTier: 'MYTHIC' },
];

/** For Prisma seed: map catalog entry to Gift create input (no id) */
export function giftCatalogToSeedRows() {
  return GIFT_CATALOG.map((entry) => ({
    name: entry.name,
    slug: entry.slug,
    icon: entry.icon,
    animationType: entry.animationType,
    coinCost: entry.coinCost,
    rarityTier: entry.rarityTier,
    isActive: true,
  }));
}
