# BeTalent Gift Animation Architecture

**Design · Music-themed · Premium · Lightweight**

---

## 1. Goals

- **Lightweight:** Animations are short (1–3s), CSS-first where possible, no heavy assets by default.
- **Music-themed:** Visual language ties to music (notes, spotlight, glow, record) rather than generic confetti or game-like effects.
- **Premium:** Restrained motion, subtle easing, and a clear progression from basic to legendary. Not childish or chaotic.
- **Sound-ready:** Metadata supports future optional sound (e.g. a short note or whoosh) without requiring it.

---

## 2. Per-Gift Animation Model

Each gift is described by:

| Field | Purpose |
|-------|--------|
| **animationType** | Key used to select the animation (e.g. `float`, `spotlight`, `luminous-panel`, `legendary`). Stored on Gift in DB and in catalog. |
| **intensity** | `low` \| `medium` \| `high` \| `legendary`. Drives scale, duration, and scope. Basic gifts use low; legendary uses legendary. |
| **scope** | Where the animation is allowed to run: `inline` (inside modal/small area), `overlay` (over video/content), or `fullscreen` (legendary only). |
| **soundId** (optional) | Future: id for a short sound clip (e.g. `gift-float`, `gift-legendary`). Not played by default until sound is implemented. |
| **durationMs** (optional) | Suggested duration in ms. Omitted = use default from intensity. |

**Examples (design intent; assets not required upfront):**

| Gift | animationType | intensity | scope | Notes |
|------|---------------|-----------|--------|-------|
| Music Note | `float` | low | inline | Soft floating note; gentle drift. |
| Microphone | `spotlight` | medium | inline, overlay | Premium spotlight pop; brief focus. |
| Piano | `luminous-panel` | medium | inline, overlay | Elegant luminous panel; soft glow. |
| Platinum Record | `legendary` | legendary | fullscreen | Legendary full-screen celebration; one clear peak, then fade. |

---

## 3. Data Flow

- **Send success:** API already returns `giftTransactionId`, `coinAmount`, `video`, etc. The client has the **selected gift** at send time (id, name, slug, animationType from the gifts list). No API change required.
- **Trigger:** When the modal enters the success state (or when the video page is notified after send), the UI has: `giftSlug`, `giftName`, and optionally `animationType` from the gift object. Look up **GiftAnimationConfig** by slug or animationType.
- **Play:** A single component (e.g. `GiftCelebration`) receives the config and the chosen **scope** for the current context (e.g. modal = inline only; video page = overlay allowed). It plays the matching animation and cleans up when done.

---

## 4. UI Integration Points

### 4.1 Modal success state (inline)

- **Where:** Inside the gift panel, when `successPayload` is set (before auto-close).
- **Scope:** `inline` only (small area so the modal stays the focus).
- **Data:** successPayload already includes `giftName`; extend with `giftSlug` and `animationType` from the selected gift so the modal can pass them to a celebration component.
- **Behavior:** Optional lightweight animation (e.g. a single note or soft glow) next to or behind the “Gift sent!” message. If no animation is implemented yet, the existing checkmark + message is enough.

### 4.2 Video page overlay (optional)

- **Where:** Video detail page, after the gift modal closes.
- **Scope:** `overlay` or `fullscreen` (for legendary), over the video or the main content area.
- **Data:** Parent keeps `lastSentGift: { slug, animationType, name } | null`. When the modal calls `onSent`, the parent also receives (or has already) the sent gift’s slug/animationType and sets `lastSentGift`. A **GiftCelebrationOverlay** renders when `lastSentGift` is non-null, looks up config, plays the animation, then clears `lastSentGift` on completion.
- **Behavior:** One-shot overlay animation; no stacking. Prefer one animation at a time.

### 4.3 Future: live feed / replay

- For a future “gifts on this video” live feed or replay, the same config (animationType, intensity, scope) can be used so each gift type has a consistent look and feel.

---

## 5. Registry and Lookup

- **Registry:** A static map (e.g. in code or config) from `animationType` or `giftSlug` → **GiftAnimationConfig**. Default config for unknown gifts: intensity `low`, scope `inline`, no sound.
- **Lookup:** `getGiftAnimationConfig(slugOrAnimationType: string): GiftAnimationConfig`. Enables modal and video page to share the same rules without duplicating logic.

---

## 6. Implementation Notes (Minimal for Now)

- **Do not overbuild:** Implement the types, registry, and integration points (props/callbacks). Animation “assets” can be placeholder (e.g. a simple opacity/scale transition) until final designs are ready.
- **Scope filtering:** When rendering, pass the current context (e.g. `scopeContext: 'inline'`) so the player only runs animations that support that scope (e.g. don’t run fullscreen in the modal).
- **Sound:** Leave `soundId` in config and do not play sounds until a dedicated sound layer exists; the UI stays silent and metadata stays sound-ready.

---

## 7. Code Integration (Current)

- **Types:** `src/types/gift-animation.ts` – `GiftAnimationConfig`, `AnimationIntensity`, `AnimationScope`.
- **Registry:** `src/constants/giftAnimationRegistry.ts` – `getGiftAnimationConfig(slugOrAnimationType)`; maps slug and animationType to config (Music Note → float/low, Microphone → spotlight/medium, Piano → luminous-panel/medium, Platinum Record → legendary/fullscreen).
- **Component:** `src/components/gift/GiftCelebration.tsx` – accepts `config`, `scopeContext`, `onComplete`, `className`; only renders if `config.scope` includes `scopeContext`. Placeholder: minimal glow animation; swap in type-specific animations later.
- **Modal:** Gift panel success state includes `giftSlug` in payload; looks up config via `getGiftAnimationConfig(successPayload.giftSlug)` and renders `<GiftCelebration config={...} scopeContext="inline" />` behind the “Gift sent!” content so the integration point is ready for full animation assets.
