# Main descendants scan – giant graphic / 125k height

## Patterns searched

- `min-h-screen` / `h-screen` / `min-h-[...]` / `h-[...]` / `w-screen`
- `absolute` / `fixed` / `inset-0`
- `overflow-visible` / `before:` / `after:`
- `<svg` / `viewBox`

## Root cause (inside main)

**Feed page** (`src/app/(public)/feed/page.tsx`):

1. **Wrapper** (already fixed): Each card wrapper had `min-h-[calc(100vh-132px)]` with no cap. With many items, total height = N × (100vh − 132) → ~125k when N is large and vh is large. **Fix:** `min-h-[min(calc(100vh-132px),800px)]`.

2. **VideoFeedCard** (`src/components/feed/VideoFeedCard.tsx`): The **article** had `h-[calc(100vh-128px)]` with no max. So each card could be thousands of pixels on a tall viewport, and the scroll column height = N × card height → again ~125k. **Fix:** `h-[min(calc(100vh-128px),800px)]` so each card is capped at 800px.

So the giant height came from **main → feed page → scroll column → N × (viewport-based card height)**. Capping both the wrapper and the card height bounds the total.

## Other pages (no unbounded height from these)

- **explore/page.tsx**: Hero has fixed `h-[260px]`…`xl-screen:h-[400px]` and `max-h-[min(400px,50vh)]`. Decorative divs use `absolute inset-0` inside `overflow-hidden` sections. No SVGs without size. Icons use `IconPlay` with explicit size.
- **leaderboard/page.tsx**: No `h-screen`/unbounded heights. Decorative layer uses `.decorative-bg` (position absolute, z-index -1, opacity 0.1). Icons use `IconTrendingUp` / `IconTrendingDown` / `IconPlus` with `w-5 h-5` / `w-4 h-4`.
- **feed/page.tsx**: Root has fixed `h-[calc(100vh-60px)]`…; only the inner scroll content was unbounded (see above).

## Shared components under main

- **VideoFeedCard**: Had unbounded card height; fixed as above. Uses Icons with explicit size. `absolute inset-0` used only inside the card (card has fixed height).
- **ExploreRailCard**: Fixed widths (`w-[180px]`…), `aspect-[3/4]`, no viewport-based height. Icons sized.
- **VideoCard**: Uses `max-h-[85vh]` and fixed heights; no unbounded growth.
- **FeedTabBar**: No SVG; fixed `min-h-[52px]`.
- **CategoryDiscoveryStrip**: No SVG; no large/min-h-screen.

## SVGs

- All page content under main uses `@/components/ui/Icons` (IconPlay, IconTrendingUp, etc.); each icon uses `iconClassName()` with default `w-4`/`w-5`/`w-6` and `max-w-[72px] max-h-[72px]`.
- `.app-shell svg` in globals.css further limits SVGs to 72px.
- No raw `<svg` or unconstrained `viewBox` in explore/leaderboard/feed page components.

## Pseudo-elements

- No `before:` or `after:` in the scanned app page/component files.

## Summary

- **Giant height:** Caused by feed scroll content: many cards each with viewport-based height and no cap. Fixed by capping the **feed card wrapper** and the **VideoFeedCard article** height to 800px.
- **Giant graphic:** No oversized SVG or decorative asset found under main; icons are constrained. If a “trophy/arrow” still appears, it is likely the same feed cards (or their gradients) appearing huge before the height cap; the cap should resolve it.
