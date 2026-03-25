# Stripe Test Mode – helyi tesztelés

A coin vásárlás és a gifting működésének tesztelése **valódi pénz nélkül** Stripe test móddal.

---

## Gyors teszt (Stripe nélkül) – development módban

**Development módban** (`npm run dev`) a wallet oldalon megjelenik egy **"+100 test coins (dev)"** gomb:

1. Nyisd meg a `/wallet` oldalt
2. Kattints a sárga **"+100 test coins (dev)"** gombra
3. 100 coin kerül a walletbe – ezekkel azonnal tudsz giftet küldeni videókra
4. Menj egy videóhoz (pl. `/video/[id]`), kattints a Gift gombra, válassz ajándékot (pl. Music Note – 10 coins) és küldd el

**Napi bónusz:** 5 coin naponta – ez is elég 1–2 olcsó gifthez (Music Note, Clap: 10 coin).

---

## Stripe test mode – teljes flow tesztelése

Ha a **coin vásárlást** is szeretnéd kipróbálni (Stripe Checkout-tal):

### 1. Stripe fiók és test kulcsok

1. Regisztrálj a [Stripe Dashboard](https://dashboard.stripe.com)-on (ingyenes)
2. Menj **Developers → API keys**
3. Kapcsold be a **Test mode**-ot (váltó jobb felül)
4. Másold ki:
   - **Secret key** (`sk_test_...`)
   - **Publishable key** (`pk_test_...`)

### 2. `.env.local` beállítása

```env
# Stripe test mode
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx

# Kötelező a redirect-ekhez (localhost esetén)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Stripe Webhook (localhost)

A vásárlás után Stripe webhook-kal jelez – ehhez a helyi szervernek elérhetőnek kell lennie:

**A) Stripe CLI (ajánlott):**

```bash
# Stripe CLI telepítés: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

A parancs kiír egy `whsec_...` webhook secretet. Add hozzá a `.env.local`-hoz:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

**B) ngrok alternatíva:**

```bash
ngrok http 3000
```

A publikus URL-t add meg a Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://xxx.ngrok.io/api/webhooks/stripe`
- Events: `checkout.session.completed`
- Másold ki a webhook signing secretet és add a `.env.local`-hoz.

### 4. Tesztkártya

Stripe test mode-ban használd a [Stripe tesztkártyákat](https://stripe.com/docs/testing#cards):

| Kártya        | Szám                | Eredmény          |
|---------------|---------------------|-------------------|
| Sikeres       | 4242 4242 4242 4242 | Sikeres fizetés   |
| Sikertelen    | 4000 0000 0000 0002 | Fizetés elutasítva|

- Lejárat: bármely jövőbeli dátum (pl. 12/34)
- CVC: bármely 3 számjegy
- Név, cím: tetszőleges

### 5. Teszt flow

1. Indítsd a dev szervert: `npm run dev`
2. Indítsd a Stripe listen-t: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Nyisd meg a `/wallet` oldalt
4. Vásárolj coin csomagot (pl. 100 coins – $0.99)
5. Stripe Checkout oldalra kerülsz → add meg a tesztkártya adatokat
6. Sikeres fizetés után visszairányít a `/wallet`-ra, a coinok megjelennek
7. Menj egy videóhoz és küldj giftet

---

## Összefoglaló

| Módszer              | Coin forrás            | Stripe kell? | Használat          |
|----------------------|------------------------|--------------|--------------------|
| Dev test coins       | +100 gomb (dev only)   | Nem          | Gifting teszt      |
| Napi bónusz          | 5 coin/nap             | Nem          | 1–2 olcsó gift     |
| Stripe test purchase | Coin csomag vásárlás   | Igen         | Teljes flow teszt  |
