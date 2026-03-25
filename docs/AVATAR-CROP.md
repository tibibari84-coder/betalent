# Avatar crop (Settings)

- **UI:** `AvatarCropModal` — main circular viewport (clip-path), **live** mini circular preview (same `dispW` / `dispH` / `pan` math scaled), drag to pan, **wheel + pinch + slider** zoom.
- **Processing:** Client-side canvas (`512×512` PNG) with circular alpha; uploaded via existing `POST /api/users/me/avatar` as `file` (filename `avatar.png`).
- **Display:** Global `.avatar-image` uses `object-fit: cover` and `object-position: center` so circles render without letterboxing.
