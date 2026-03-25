# BeTalent Gift Catalog – Design & Seed Strategy

Music-themed, premium MVP catalog. Single source of truth: **`src/constants/giftCatalog.ts`**.

---

## Rarity Tiers

| Tier       | Label     | Order | Use case                          |
|-----------|-----------|-------|-----------------------------------|
| `BASIC`   | Basic     | 1     | Low-cost, high-frequency support  |
| `PREMIUM` | Premium   | 2     | Mid-tier, visible appreciation    |
| `RARE`    | Rare      | 3     | Stand-out support                 |
| `LEGENDARY` | Legendary | 4   | Top-tier, maximum impact         |

---

## MVP Catalog

| Display name      | Slug             | Icon ref         | Animation | Coins | Rarity   |
|-------------------|------------------|------------------|-----------|-------|----------|
| Music Note        | `music-note`     | music-note       | float     | 25    | BASIC    |
| Microphone        | `microphone`     | microphone       | sparkle   | 50    | BASIC    |
| Headphones        | `headphones`     | headphones       | pulse     | 100   | PREMIUM  |
| Drum Beat         | `drum-beat`      | drum             | bounce    | 150   | PREMIUM  |
| Piano             | `piano`          | piano            | glow      | 250   | RARE     |
| Golden Score      | `golden-score`   | golden-score     | shine     | 500   | RARE     |
| Platinum Record   | `platinum-record`| platinum-record  | legendary | 1000  | LEGENDARY|

**Icon reference:** Use for asset key or component name (e.g. `/icons/gifts/microphone.svg` or `<GiftIcon name="microphone" />`).  
**Animation type:** Hint for front-end (float, sparkle, pulse, bounce, glow, shine, legendary).

---

## Seed Strategy

1. **Source of truth:** `GIFT_CATALOG` in `src/constants/giftCatalog.ts`.
2. **Seed helper:** `giftCatalogToSeedRows()` returns rows ready for `prisma.gift.create({ data: row })`.
3. **Seed order:** Run after users and categories; run before UserWallet and demo GiftTransactions. Gifts must exist before any GiftTransaction.
4. **Idempotency:** Seed script deletes all `Gift` rows then re-inserts from catalog. For production, use upsert by `slug` if you need to preserve existing IDs.

**Example upsert (optional, for non-destructive seed):**

```ts
for (const entry of GIFT_CATALOG) {
  await prisma.gift.upsert({
    where: { slug: entry.slug },
    create: {
      name: entry.name,
      slug: entry.slug,
      icon: entry.icon,
      animationType: entry.animationType,
      coinCost: entry.coinCost,
      rarityTier: entry.rarityTier,
      isActive: true,
    },
    update: {
      name: entry.name,
      icon: entry.icon,
      animationType: entry.animationType,
      coinCost: entry.coinCost,
      rarityTier: entry.rarityTier,
    },
  });
}
```

---

## Brand Consistency

- Names are **music/performance** (note, mic, headphones, drum, piano, score, record).
- Coin costs **increase with rarity** (25 → 1000).
- Tiers support UI treatment (color, border, badge) without changing catalog data.
- Icon and animation types are placeholders; replace with real assets and Lottie/CSS as needed.

---

## Adding or Changing Gifts

1. Edit `GIFT_CATALOG` in `src/constants/giftCatalog.ts`.
2. Run `npm run db:seed` (with destructive seed) or implement upsert-by-slug and run seed.
3. If schema changes (e.g. new field), add it to `GiftCatalogEntry` and to the Prisma `Gift` model, then re-run migrate and seed.
