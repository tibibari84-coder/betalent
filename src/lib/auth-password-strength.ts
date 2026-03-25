export type PasswordStrengthResult = {
  score: number; // 0–4
  label: string;
  checks: { id: string; ok: boolean; text: string }[];
};

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = [
    { id: 'len', ok: password.length >= 8, text: 'At least 8 characters' },
    { id: 'lower', ok: /[a-z]/.test(password), text: 'One lowercase letter' },
    { id: 'upper', ok: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { id: 'num', ok: /[0-9]/.test(password), text: 'One number' },
    { id: 'sym', ok: /[^a-zA-Z0-9\s]/.test(password), text: 'One symbol (! @ # $ …)' },
  ];
  const score = checks.filter((c) => c.ok).length;
  const label =
    score === 0
      ? 'Add characters'
      : score <= 2
        ? 'Keep going'
        : score <= 3
          ? 'Almost there'
          : score < 5
            ? 'Good'
            : 'Strong password';
  return { score, label, checks };
}
