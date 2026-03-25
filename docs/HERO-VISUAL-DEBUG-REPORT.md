# Hero Visual Debug Report — /explore

## Exact Page File Rendering the Hero

**File:** `src/app/(public)/explore/page.tsx`

**JSX (lines 166–170):**
```tsx
{/* 1. DISCOVERY HERO — interactive carousel */}
<section className="min-w-0">
  <ExploreHeroCarousel />
</section>
```

**Parent hierarchy:**
1. `body` → `I18nLayoutWrapper` → `AuthAwareShell` → `RootShell`
2. `RootShell` → `main` (grid center column, `minmax(0,1fr)`)
3. `main` → explore page root div (`pb-24 min-w-0 overflow-x-hidden w-full`)
4. explore page root → `layout-content` (`max-width: 1200px`, `min-width: 0`)
5. `layout-content` → `section` (`min-w-0`)
6. `section` → `ExploreHeroCarousel`

---

## Exact Component Rendering the Right-Side Visual

**File:** `src/components/explore/ExploreHeroCarousel.tsx`

**Right-side JSX (lines 263–282):**
```tsx
{/* Right: HERO VISUAL — simple test first; must never collapse */}
<div
  className="explore-hero-visual relative z-10 flex shrink-0 items-center justify-center order-1 laptop:order-2"
  style={{
    width: 300,
    height: 300,
    minWidth: 300,
    minHeight: 300,
    flexShrink: 0,
    borderRadius: '50%',
    border: '3px solid red',
    background: 'black',
    color: 'white',
    fontSize: 18,
    fontWeight: 700,
  }}
>
  HERO TEST
</div>
```

---

## Exact Bug Cause

**Primary:** Right-side wrapper had `min-w-0` on all breakpoints. In a flex column (mobile), `min-w-0` lets the flex item shrink below its content width. With default `flex-shrink: 1`, the right side could collapse to 0 width and become invisible.

**Secondary:** `.app-shell svg` in `globals.css` forces all SVGs to `max-width: 72px` and `max-height: 72px`. The hero ring and logos are SVGs, so they were capped to 72px and effectively invisible in a 260–320px container.

**Tertiary:** On laptop/desktop, `overflow-hidden` on the hero root could clip the right side when the hero width was less than left + right + gap (e.g. narrow center column in the 3-column grid).

---

## Exact Files Changed

| File | Change |
|------|--------|
| `src/components/explore/ExploreHeroCarousel.tsx` | Replaced right-side EnergyRing with minimal 300×300 test circle (red border, black bg, white "HERO TEST"); added `shrink-0`, explicit `width`/`height`/`minWidth`/`minHeight` to prevent collapse |
| `src/app/globals.css` | Added `.explore-hero-visual svg { max-width: none; max-height: none; }` to override `.app-shell svg` for hero visuals |

---

## Next Step

Once the 300×300 test circle is visibly confirmed on `/explore`, reintroduce the premium EnergyRing + logo styling, keeping:
- `shrink-0` on the right wrapper
- `min-w-[260px]` (or similar) on all breakpoints — never `min-w-0` on the right
- `.explore-hero-visual` class for SVG override
