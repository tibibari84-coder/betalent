# Local auth + Google OAuth (BETALENT)

## Database

From the project root, with `DATABASE_URL` set in `.env`:

```bash
npm run db:deploy
npm run db:generate
```

(Equivalent: `npx prisma migrate deploy` then `npx prisma generate`.)

## Google sign-in

In `.env` or `.env.local` (project root, next to `package.json`):

```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Google Cloud Console → OAuth 2.0 Client → **Authorized redirect URIs** must include:

`http://localhost:3000/api/auth/google/callback`

Restart `npm run dev` after changing env.

If `GOOGLE_CLIENT_ID` is missing, `/api/auth/google` redirects to `/login?error=google_config` or `/register?error=google_config` instead of returning raw JSON.

## Phone + Google sign-in (local dev, HTTPS tunnel)

Google OAuth does not accept `http://192.168.x.x` or other private URLs as redirect origins. To test on a **real phone** with **Google login**, expose the dev server on a **public HTTPS URL** and set `NEXT_PUBLIC_APP_URL` to that host.

### Option A — ngrok

1. **Install** (macOS Homebrew):

   ```bash
   brew install ngrok/ngrok/ngrok
   ```

   Skip if already installed (`ngrok version`).

2. **Start the app** (project root):

   ```bash
   npm run dev
   ```

3. **In a second terminal**, tunnel port 3000:

   ```bash
   ngrok http 3000
   ```

   Copy the **HTTPS** URL ngrok prints (e.g. `https://abc123.ngrok-free.app`).

4. **`.env.local`** (restart dev server after saving):

   ```env
   NEXT_PUBLIC_APP_URL="https://abc123.ngrok-free.app"
   ```

5. **Google Cloud Console** → OAuth 2.0 Client → add:

   - **Authorized JavaScript origins:** `https://abc123.ngrok-free.app`
   - **Authorized redirect URIs:** `https://abc123.ngrok-free.app/api/auth/google/callback`

6. Open **`https://abc123.ngrok-free.app`** on the phone (not `192.168...`). Camera and upload can be tested the same way.

**Note:** Free ngrok URLs change each session. Whenever the URL changes, update **both** `.env.local` and the Google Console entries (origin + redirect).

### Option B — Cloudflare quick tunnel (repo script)

From the project root:

```bash
./scripts/dev-with-tunnel.sh
```

Use the printed `https://....trycloudflare.com` URL as `NEXT_PUBLIC_APP_URL` and add the same path suffixes in Google Console (`/api/auth/google/callback` for redirect).

## Entry routes

| Route            | Role                                      |
|-----------------|-------------------------------------------|
| `/`             | Public home (CTAs to login/register)      |
| `/login`        | Sign in                                   |
| `/register`     | Create account                            |
| `/verify-email` | Email confirmation / resend (secondary)   |

Protected app areas (e.g. `/feed`, `/upload`) require a verified email; middleware redirects unverified sessions to `/verify-email`.
