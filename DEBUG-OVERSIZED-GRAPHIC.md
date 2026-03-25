# Óriási kék/lila grafikus elem – mi a teendő

## 1. Először ezt próbáld (2 perc)

1. **Állítsd le** a dev szervert (terminálban Ctrl+C).
2. **Indítsd újra:** `npm run dev`
3. **Chrome-ban:** nyomd meg **Cmd+Shift+R** (Mac) vagy **Ctrl+Shift+R** (Windows) – ez hard refresh, törli a cache-t.
4. Nyisd meg újra: `http://localhost:3000`

Ha így is ott van az óriási kép, menj tovább a 2. lépésre.

---

## 2. Megkeresni a hibás elemet (Chrome DevTools)

1. **Kattints jobb gombbal** pont az óriási kék/lila formára (a “térkép” vagy “trophy” grafikára).
2. Válaszd: **“Inspect”** (Vizsgálat / Elem vizsgálata).
3. A **bal oldali** panelen kijelölődik az a HTML elem, ami a grafikát adja.
4. Nézd meg:
   - **Mi a tag neve?** (pl. `div`, `img`, `section`, `svg`)
   - Van-e **class** vagy **id**? (pl. `class="..."` vagy `id="..."`)
5. A **jobb oldali “Styles”** panelen nézd meg:
   - Van-e **`background`** vagy **`background-image`**?
   - Ha igen, mi áll mögötte? Pl. `url("...")` – és mi a fájl neve vagy URL?

**Ide másold be** (vagy készíts egy képernyőképet erről a DevTools nézetről), és küldd el:
- a kijelölt elem típusát (pl. `<div class="...">`),
- és a `background` / `background-image` sort a Styles-ból.

Ebből meg tudjuk mondani, melyik fájlban kell javítani.

---

## 3. Ha nem találod a background-ot

Ha az elemnek **nincs** `background-image`-je, akkor lehet **`<img>`** vagy **`<svg>`**.

- Ha **img**: a Styles panelen nézd meg a **méretet** (width, height, max-width).
- Írd le, hogy milyen **src** van az `<img>`-en (pl. `/logo.png` vagy más).

Ezt is küldd el, és azt is javítjuk.

---

## 4. Gyors teszt: inkognitó

Nyisd meg az oldalt **Chrome inkognitóban** (Cmd+Shift+N), és menj a `http://localhost:3000`-re.

- Ha **inkognitóban nincs** az óriási kép → valószínűleg böngésző bővítmény (pl. reklámblokkoló, stílusok) okozza. Kapcsold ki a bővítményeket, vagy használj inkognitót fejlesztéshez.
- Ha **inkognitóban is megjelenik** → akkor a kódban van, és a 2. lépés (Inspect + Styles) megmutatja, hol.
