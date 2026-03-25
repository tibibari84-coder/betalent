import type { CoinPackage } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type CoinPackagePublic = {
  id: string;
  internalName: string;
  name: string;
  coins: number;
  bonusCoins: number | null;
  effectiveCoins: number;
  price: number;
  currency: string;
  stripePriceId: string | null;
  isActive: boolean;
  isPromotional: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
};

/**
 * Total coins to credit for a purchase: base + optional bonus.
 */
export function getEffectiveCoins(pkg: { coins: number; bonusCoins: number | null }): number {
  return pkg.coins + (pkg.bonusCoins ?? 0);
}

/**
 * True if the package is currently within its validity window (if set).
 */
export function isCurrentlyValid(pkg: {
  validFrom: Date | null;
  validUntil: Date | null;
}): boolean {
  const now = new Date();
  if (pkg.validFrom != null && now < pkg.validFrom) return false;
  if (pkg.validUntil != null && now > pkg.validUntil) return false;
  return true;
}

function toPublic(pkg: CoinPackage): CoinPackagePublic {
  const price = Number(pkg.price);
  const effectiveCoins = getEffectiveCoins({ coins: pkg.coins, bonusCoins: pkg.bonusCoins });
  return {
    id: pkg.id,
    internalName: pkg.internalName,
    name: pkg.name,
    coins: pkg.coins,
    bonusCoins: pkg.bonusCoins,
    effectiveCoins,
    price,
    currency: pkg.currency,
    stripePriceId: pkg.stripePriceId,
    isActive: pkg.isActive,
    isPromotional: pkg.isPromotional,
    validFrom: pkg.validFrom,
    validUntil: pkg.validUntil,
  };
}

/**
 * Lists active packages that are currently valid, ordered by sortOrder.
 */
export async function listActive(): Promise<CoinPackagePublic[]> {
  const now = new Date();
  const packages = await prisma.coinPackage.findMany({
    where: {
      isActive: true,
      OR: [
        { validFrom: null, validUntil: null },
        {
          validFrom: { lte: now },
          validUntil: null,
        },
        {
          validFrom: null,
          validUntil: { gte: now },
        },
        {
          validFrom: { lte: now },
          validUntil: { gte: now },
        },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });

  return packages.map(toPublic);
}

/**
 * Get package by id. Returns null if not found.
 */
export async function getById(id: string): Promise<CoinPackagePublic | null> {
  const pkg = await prisma.coinPackage.findUnique({ where: { id } });
  return pkg ? toPublic(pkg) : null;
}

/**
 * Get package by internal name. Returns null if not found.
 */
export async function getByInternalName(internalName: string): Promise<CoinPackagePublic | null> {
  const pkg = await prisma.coinPackage.findUnique({ where: { internalName } });
  return pkg ? toPublic(pkg) : null;
}
