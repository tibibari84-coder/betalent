# Smoke flows — manual QA checklist

Rövid, **végponttól végpontig** ellenőrzés staging / dev környezetben, mielőtt release vagy nagy refaktor megy ki. Nem helyettesíti az automatizált E2E-t; cél: a kritikus utak **működnek** és **konzisztens JSON**-t adnak.

**Kapcsolódó:** discovery/ranking modulok → `docs/RANKING-ASSEMBLY.md`.

---

## Előfeltételek

- [ ] Adatbázis migrációk futnak; `npx prisma migrate deploy` (vagy dev: `db push`) rendben.
- [ ] `.env.local` kitöltve (lásd `.env.example`): auth, DB, opcionálisan R2/S3 upload, Stripe **test** kulcsok ha coin vásárlást tesztelsz.
- [ ] Böngészőben legalább egy **tesztfelhasználó** (regisztráció vagy seed).

---

## 1. Auth

| # | Lépés | Elvárt |
|---|--------|--------|
| 1.1 | Regisztráció / bejelentkezés | Átirányítás feedre vagy home; nincs loop. |
| 1.2 | `GET /api/auth/me` (bejelentkezve) | 200, felhasználói objektum. |
| 1.3 | `POST /api/auth/logout` | 200/204; utána védett oldal loginra esik. |
| 1.4 | Újra login | Session működik. |

---

## 2. Discovery / feed (publikus + bejelentkezve)

| # | Lépés | Elvárt |
|---|--------|--------|
| 2.1 | `GET /api/feed/for-you?limit=10` | 200, lista / ok struktúra (üres is ok ha nincs adat). |
| 2.2 | `GET /api/feed/trending?...` | 200. |
| 2.3 | `GET /api/feed/new-voices?...` | 200. |
| 2.4 | Bejelentkezve: `GET /api/feed/following?...` | 200 (üres lista ok, ha nem követsz senkit). |
| 2.5 | `GET /api/feed/challenge-videos?limit=10` | 200; challenge feed tab ugyanezt a listát használja. |

---

## 2b. Contact (bizalom)

| # | Lépés | Elvárt |
|---|--------|--------|
| 2b.1 | `CONTACT_INBOX_EMAIL` + Resend/SendGrid nélkül: `POST /api/contact` | 503 vagy érvényes hiba — **nem** ál-siker. |
| 2b.2 | Beállított inbox + providerrel: `POST /api/contact` JSON `{ subject, email, message }` | 200 `{ ok: true, delivered: true }`; üzenet megérkezik az inboxba. |

---

## 3. Videó megtekintés, like, szavazat

| # | Lépés | Elvárt |
|---|--------|--------|
| 3.1 | `GET /api/videos/[id]` létező publikus ID-val | 200 + videó; nem szivárog privát mező. |
| 3.2 | `POST /api/videos/[id]/view` | 200, számláló nem hibázik. |
| 3.3 | Like toggle (UI vagy `POST /api/likes/toggle` ha így van bekötve) | Konzisztens állapot. |

*(Projektben a vote lehet `POST /api/videos/[id]/vote` vagy `/api/vote` — a UI szerint ellenőrizd egy videón.)*

---

## 4. Kommentek (kanonikus API)

| # | Lépés | Elvárt |
|---|--------|--------|
| 4.1 | `GET /api/comments?videoId=...` | Top szintű kommentek. |
| 4.2 | `POST /api/comment` body: `{ "videoId", "body" }` | 200, `{ ok: true, comment }`. |
| 4.3 | Válasz: ugyanígy + `parentId` top-level comment id | 200; max mélység betartva (hiba esetén 400). |
| 4.4 | *(Opcionális)* `POST /api/comments/create` | Ugyanaz a domain viselkedés; válaszfejlécek: Deprecation / Link / Sunset. |

---

## 5. Követés

| # | Lépés | Elvárt |
|---|--------|--------|
| 5.1 | `POST /api/follows/toggle` vagy `POST /api/follow` (projekt konvenció) | Állapot vált; követő számok konzisztensek. |

*(Ellenőrizd a frontendet: melyik endpoint aktív — mindkettő létezhet; követés után following feed frissül.)*

---

## 6. Wallet és ajándék (teszt)

| # | Lépés | Elvárt |
|---|--------|--------|
| 6.1 | `GET /api/wallet` | 200, egyenleg / struktúra. |
| 6.2 | Dev/staging: ha elérhető `POST /api/wallet/dev-test-coins` | Csak nem-produkció; egyenleg nő. |
| 6.3 | `GET /api/coin-packages` | Lista betölt. |
| 6.4 | `POST /api/gifts/send` megfelelő body-val | 200 vagy üzleti hiba üzenettel; nem 500 schema drift nélkül. |

---

## 7. Coin vásárlás (Stripe test)

| # | Lépés | Elvárt |
|---|--------|--------|
| 7.1 | `GET /api/coin-packages` — Stripe readiness | Ha nincs kulcs: kontrollált hibaüzenet, nem crash. |
| 7.2 | `POST /api/coins/purchase` test módban | Checkout URL vagy konfigurációs üzenet; **ne** `pk_live` production launch nélkül. |
| 7.3 | Webhook: `stripe listen` → `POST /api/webhooks/stripe` | Aláírás ellenőrzés; esemény feldolgozás log. |

---

## 8. Upload (ha storage be van kötve)

| # | Lépés | Elvárt |
|---|--------|--------|
| 8.1 | `POST /api/upload/init` | Presigned / session adatok. |
| 8.2 | Client PUT blob | Siker. |
| 8.3 | `POST /api/videos/upload/complete` | Videó rekord processing állapotban. |

---

## 9. Challenge / live (ha használjátok)

| # | Lépés | Elvárt |
|---|--------|--------|
| 9.1 | `GET /api/challenges/[slug]` | 200. |
| 9.2 | Belépés / szavazat a UI szerinti route-tal | Üzleti szabályok; nincs nyers 500. |

---

## 10. Értesítések

| # | Lépés | Elvárt |
|---|--------|--------|
| 10.1 | `GET /api/notifications` bejelentkezve | 200. |
| 10.2 | Olvasottnak jelölés (ha van route) | Konzisztens. |

---

## Gyors parancsok (dev)

```bash
npx tsc --noEmit
# Opcionális: egy route smoke curl (session cookie kell)
```

---

## Jegyzőkönyv

| Dátum | Környezet | Futtató | Eredmény (pass/fail) | Megjegyzés |
|-------|-----------|---------|----------------------|------------|
| | | | | |
