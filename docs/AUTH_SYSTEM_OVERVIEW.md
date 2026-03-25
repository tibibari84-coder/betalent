# BeTalent — authentication & trust signals

## Product language (do not conflate)

| Term | Meaning |
|------|--------|
| **Email ownership verified** (`emailVerifiedAt`) | User can receive email at this address. **Not** legal identity. |
| **2FA enabled** (`twoFactorEnabled` + `twoFactorMethod`) | Extra factor at **sign-in** (TOTP today). **Not** sign-up verification. |
| **Phone verified** (`phoneVerifiedAt`) | Reserved / future — proves control of `phoneE164`. **SMS is not implemented** in UI or send path. |
| **Creator / identity verified** (`User.isVerified`, `CreatorVerification`) | Moderation / KYC-style trust badge. **Separate** from email verification. |

## Account states (runtime)

- **Unverified (email path)**: `emailVerifiedAt == null` — may browse public app if session exists; **protected app areas** redirect to `/verify-email`; **upload, gifts, coin purchase** APIs return `403` + `EMAIL_NOT_VERIFIED`.
- **Verified**: `emailVerifiedAt != null` — full app access subject to moderation.
- **2FA pending**: `session.pending2FAUserId` set after password OK — only `/login/2fa` (and sign-out) until TOTP succeeds.
- **Suspended / banned**: `moderationStatus` in `SUSPENDED` | `BANNED` — login blocked.

## Security controls (summary)

- Passwords: bcrypt (cost 12), strong rules on register/password change.
- Verification & reset tokens: random opaque token, **SHA-256** stored, TTL (email 24h, reset 1h).
- Sessions: iron-session, encrypted cookie; middleware unseal for route gating.
- Rate limits: register (IP), login (IP + email), resend verification (IP + user), password reset (IP + email).
- Audit: `AuthAuditLog` for auth events.
- TOTP secret: **encrypted** with `AUTH_ENCRYPTION_KEY` (required in production for 2FA enable).

## Email delivery

- **Resend** via `RESEND_API_KEY` + `EMAIL_FROM`, or dev logs only (no fake “sent” in production without provider).
