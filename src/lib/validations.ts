import { z } from 'zod';
import { isValidCountryCode } from '@/lib/countries';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'hu'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const supportedLocales = SUPPORTED_LOCALES;

/** Non–letter/digit and not whitespace (allows ! @ # $ €, etc.). */
const PASSWORD_SPECIAL_RE = /[^a-zA-Z0-9\s]/;

const DEFAULT_PASSWORD_EXEMPT_EMAILS = 'betalent@gmail.com';

/** Comma-separated lowercased emails that may keep legacy passwords (no symbol) on change/reset — not used for registration. */
function passwordPolicyExemptEmailSet(): Set<string> {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PASSWORD_POLICY_EXEMPT_EMAILS?.trim()) ||
    DEFAULT_PASSWORD_EXEMPT_EMAILS;
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPasswordPolicyExemptEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return passwordPolicyExemptEmailSet().has(email.trim().toLowerCase());
}

function validatePasswordCoreNoSymbol(password: string): { ok: true } | { ok: false; message: string } {
  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'Password must include a lowercase letter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'Password must include an uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Password must include a number.' };
  }
  return { ok: true };
}

/** Registration & new accounts: min 8 chars, lower + upper + number + symbol. */
export function validatePasswordPolicy(password: string): { ok: true } | { ok: false; message: string } {
  const core = validatePasswordCoreNoSymbol(password);
  if (!core.ok) return core;
  if (!PASSWORD_SPECIAL_RE.test(password)) {
    return { ok: false, message: 'Password must include a symbol (e.g. ! @ # $).' };
  }
  return { ok: true };
}

/**
 * Password change / reset: strict for normal users; exempt list (e.g. admin) may omit symbol (legacy).
 * Registration should always use {@link validatePasswordPolicy} instead.
 */
export function validatePasswordPolicyForUser(
  password: string,
  email: string | null | undefined
): { ok: true } | { ok: false; message: string } {
  if (isPasswordPolicyExemptEmail(email)) {
    return validatePasswordCoreNoSymbol(password);
  }
  return validatePasswordPolicy(password);
}

/** Legacy (pre-symbol policy): 8+ chars, upper, lower, number — no symbol. */
export const legacyPasswordRelaxed = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .refine((pw) => /[a-z]/.test(pw), { message: 'Password must include a lowercase letter' })
  .refine((pw) => /[A-Z]/.test(pw), { message: 'Password must include an uppercase letter' })
  .refine((pw) => /[0-9]/.test(pw), { message: 'Password must include a number' });

/** Exported for password change API — same rules as registration (exempt users handled in route). */
export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .refine((pw) => /[a-z]/.test(pw), { message: 'Password must include a lowercase letter' })
  .refine((pw) => /[A-Z]/.test(pw), { message: 'Password must include an uppercase letter' })
  .refine((pw) => /[0-9]/.test(pw), { message: 'Password must include a number' })
  .refine((pw) => PASSWORD_SPECIAL_RE.test(pw), {
    message: 'Password must include a symbol (e.g. ! @ # $)',
  });

export const registerSchema = z
  .object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  /** Optional referrer ID from shared link (?ref=). Stored for attribution; self-referral blocked server-side. */
  referrerId: z.string().cuid().optional(),
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your password'),
  displayName: z.string().min(1).max(100),
  /** Preferred key for country selection. ISO 3166-1 alpha-2. */
  countryCode: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v === undefined || v === null || v.trim() === '' || isValidCountryCode(v.trim()), {
      message: 'Country code must be a valid ISO 3166-1 alpha-2 code',
    }),
  /** Backward-compatible alias for older clients. ISO 3166-1 alpha-2. */
  country: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v === undefined || v === null || v.trim() === '' || isValidCountryCode(v.trim()), {
      message: 'Country must be a valid ISO 3166-1 alpha-2 code',
    }),
  city: z.string().max(100).optional(),
  talentType: z.string().max(100).optional(),
  /** Preferred UI language. Stored on account and applied after login. */
  preferredLocale: z.enum(supportedLocales).optional().default('en'),
  /** Required: user must acknowledge Fair Play, Authentic Performance, Anti-Fraud, and Content Originality policies. */
  fairPlayPolicyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Fair Play, Authentic Performance, Anti-Fraud, and Content Originality policies.' }),
  }),
  /** Required: user must accept Terms of Service and Creator Rules. */
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service and Creator Rules.' }),
  }),
})
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/** Body parse only — validate password with {@link validatePasswordPolicyForUser} after resolving user email. */
export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(16),
    password: z.string().min(1).max(100),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(16),
});

export const totpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});

export const totpEnableSchema = z.object({
  secret: z.string().min(10).max(200),
  code: z.string().regex(/^\d{6}$/),
});

export const uploadVideoSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  categoryId: z.string().cuid(),
  videoUrl: z.string().url(),
  publicId: z.string().min(1),
  thumbnailUrl: z.string().url().optional(),
  durationSec: z.number().int().min(1),
});

export const commentCreateSchema = z.object({
  videoId: z.string().cuid(),
  body: z.string().min(1).max(500),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  talentType: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const preferredLocaleUpdateSchema = z.object({
  preferredLocale: z.enum(supportedLocales),
});

/** Combined PATCH /api/users/me body: locale and/or profile fields */
export const userMeUpdateSchema = z.object({
  preferredLocale: z.enum(supportedLocales).optional(),
  displayName: z
    .string()
    .max(100)
    .optional()
    .refine((v) => v === undefined || (typeof v === 'string' && v.trim().length >= 1), {
      message: 'Display name is required',
    }),
  bio: z.string().max(500).optional().nullable(),
  country: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v === undefined || v === null || (typeof v === 'string' && (v.trim() === '' || isValidCountryCode(v.trim()))), {
      message: 'Country must be a valid ISO 3166-1 alpha-2 code',
    }),
  /** Explicit ISO key for clients that use countryCode naming. */
  countryCode: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v === undefined || v === null || (typeof v === 'string' && (v.trim() === '' || isValidCountryCode(v.trim()))), {
      message: 'Country code must be a valid ISO 3166-1 alpha-2 code',
    }),
  avatarUrl: z.string().url().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PreferredLocaleUpdateInput = z.infer<typeof preferredLocaleUpdateSchema>;
