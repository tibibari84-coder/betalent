# BeTalent — Indítási költségek (kanadai dollárban)

*Minden fizetős szolgáltatás és becsült havi költség. Frissítve: 2025.*

---

## Összefoglaló

| Szolgáltatás | Minimum (indítás) | Ajánlott (produkció) |
|--------------|-------------------|----------------------|
| Hosting (Vercel) | **0 CAD** | **~27 CAD/hó** |
| Adatbázis (PostgreSQL) | **0 CAD** | **0–20 CAD/hó** |
| Tárhely (R2: videók, avatarok) | **0 CAD** | **0–15 CAD/hó** |
| Fizetések (Stripe) | **0 CAD** | **tranzakciónként** |
| Domain | **~15 CAD/év** | **~15 CAD/év** |
| **Összesen (indítás)** | **~0–15 CAD** | **~30–80 CAD/hó** |

*1 USD ≈ 1,37 CAD (2025)*

---

## 1. Hosting — Vercel

**Miért:** Next.js alkalmazás, automatikus deploy, CDN, edge.

| Terv | Ár (USD) | Ár (CAD) | Limit |
|-----|----------|----------|-------|
| **Hobby (ingyenes)** | 0 | **0** | 200 projekt, 100 deploy/nap, személyes használat |
| **Pro** | 20/fő/hó | **~27 CAD/fő/hó** | Korlátlan projekt, 6000 deploy/nap, csapat |

**Indításhoz:** Hobby ingyenes. Ha komolyabb forgalom: Pro.

---

## 2. Adatbázis — PostgreSQL

**Miért:** Prisma + PostgreSQL. Szükséges: `DATABASE_URL`.

| Szolgáltató | Ingyenes terv | Fizetős (becsült) |
|-------------|---------------|-------------------|
| **Neon** | 0,5 GB, 100 CU-h/ projekt, scale-to-zero | ~15 USD/hó (Launch) → **~20 CAD** |
| **Supabase** | 500 MB, 2 projekt | ~25 USD/hó → **~34 CAD** |
| **Railway** | 5 USD kredit/hó | ~5–20 USD/hó → **~7–27 CAD** |

**Indításhoz:** Neon ingyenes terv elég (0,5 GB, 100 CU-h). Kis forgalomra bőven elég.

---

## 3. Tárhely — Cloudflare R2

**Miért:** Videók, avatarok, thumbnails. S3-kompatibilis.

| Tétel | Ingyenes (havonta) | Utána (USD) | CAD |
|-------|--------------------|-------------|-----|
| Tárhely | 10 GB | 0,015 USD/GB-hó | ~0,02 CAD/GB |
| Class A (írás) | 1M kérés | 4,50 USD/M | ~6,2 CAD/M |
| Class B (olvasás) | 10M kérés | 0,36 USD/M | ~0,5 CAD/M |
| Egress (letöltés) | **Korlátlan ingyenes** | 0 | 0 |

**Indításhoz:** 10 GB ingyenes. Kezdő szinten általában 0 CAD.

---

## 4. Fizetések — Stripe

**Miért:** Coin vásárlás (Checkout redirect). Nincs havi díj.

| Tétel | Díj (Kanada) |
|-------|--------------|
| Sikeresség | **2,9% + 0,30 CAD** tranzzakciónként |
| Nemzetközi kártya | +0,8% |
| Dispute (vita) | 15 CAD (visszatérítés ha nyersz) |

**Indításhoz:** 0 CAD havi díj. Csak tranzakciónként fizetsz.

---

## 5. Domain

**Miért:** Saját domain (pl. betalent.com).

| Szolgáltató | Ár |
|-------------|-----|
| Namecheap, Google Domains, Cloudflare | **~10–15 USD/év** → **~14–21 CAD/év** |

---

## 6. Nem használt (BeTalent-ben)

- **Email küldés** — Nincs Resend/SendGrid/Mailgun
- **SMS** — Nincs Twilio
- **Realtime** — Nincs Pusher/Ably
- **AI scoring** — Van vocal scoring service, de külső API díj nem látszik a kódban

---

## Indítási forgatókönyvek

### A) Minimális (0 CAD/hó)

- Vercel Hobby (ingyenes)
- Neon Free (ingyenes)
- Cloudflare R2 Free (10 GB)
- Stripe: 0 havi díj (csak tranzakciók)
- Domain: ~15 CAD/év (opcionális; lehet vercel.app subdomain)

**Összesen:** ~0 CAD/hó, domain esetén ~1,25 CAD/hó

### B) Stabil produkció (~50–80 CAD/hó)

- Vercel Pro: ~27 CAD/hó
- Neon Launch vagy Supabase: ~20–34 CAD/hó
- R2: ~0–15 CAD/hó (forgalomtól függ)
- Stripe: tranzakciónként
- Domain: ~15 CAD/év

**Összesen:** ~50–80 CAD/hó

### C) Skálázott produkció

- Vercel Pro vagy Enterprise
- Neon Scale / Supabase Pro
- R2: tárhely és műveletek alapján
- Stripe: ugyanaz (tranzakciónként)

---

## Kötelező env változók (fizetős szolgáltatásokhoz)

| Változó | Szolgáltatás | Költség |
|---------|--------------|---------|
| `DATABASE_URL` | Neon/Supabase/Railway | 0–34 CAD/hó |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 | 0–15 CAD/hó |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe | 0 havi (tranzakciónként) |
| `SESSION_SECRET` | — | Ingyenes |

---

## Összegzés

**Teljes oldal indítása minimális költséggel:** ~0 CAD/hó (Vercel + Neon + R2 free tier).  
**Saját domain:** ~15 CAD/év.  
**Stripe:** Csak akkor fizetsz, ha valaki vásárol (2,9% + 0,30 CAD).
