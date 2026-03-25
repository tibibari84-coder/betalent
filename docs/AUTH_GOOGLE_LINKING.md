# Google OAuth — account linking rules (BeTalent)

These rules prevent duplicate accounts while keeping email ownership and sign-in methods explicit.

## Preconditions

- Google sign-in is only accepted when Google reports `email_verified = true`.
- `User.googleId` stores Google’s `sub` (stable per Google account).

## Resolution order

1. **Match by `googleId`**  
   If a user row exists with this `sub`, that user signs in. No duplicate.

2. **Match by email (case-sensitive DB email; Google normalized)**  
   If no row has this `googleId` but a row exists with the same `email`:
   - If `googleId` is **null**: **link** — set `googleId` to this `sub`.  
     If `emailVerifiedAt` was null, set it to **now** (Google already verified the inbox).
   - If `googleId` is **set and different** from `sub`: **reject** with `GOOGLE_ACCOUNT_CONFLICT` (data inconsistency / rare edge case — operator review).

3. **No match**  
   Create a new user: `passwordHash = null`, `emailVerifiedAt = now()`, `googleId = sub`, wallet created.

## Cross-scenarios (product behavior)

| Scenario | Result |
|----------|--------|
| Email/password signup, same email later uses Google | **Link** Google to existing user; email becomes verified if it was not (Google-trusted). |
| Google signup first, later “password login” | **Fails** (no password). User must use **Forgot password** (email link) to set a password, or keep using Google. |
| Google signup, duplicate email impossible at DB level | N/A — `email` is unique. |
| Two different Google accounts, same email | Not possible from Google for one inbox; if DB inconsistent, conflict path applies. |

## Enumeration notes

- Password login uses a **generic** “Invalid email or password” when the user has no password (e.g. Google-only).
- Forgot-password always returns the **same success message** whether or not the email exists.
