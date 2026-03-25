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

## Entry routes

| Route            | Role                                      |
|-----------------|-------------------------------------------|
| `/`             | Public home (CTAs to login/register)      |
| `/login`        | Sign in                                   |
| `/register`     | Create account                            |
| `/verify-email` | Email confirmation / resend (secondary)   |

Protected app areas (e.g. `/feed`, `/upload`) require a verified email; middleware redirects unverified sessions to `/verify-email`.
