/**
 * Runs once per Node server instance (not Edge). Validates required production config early.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { assertProductionRuntimeConfig } = await import('@/lib/runtime-config');
  assertProductionRuntimeConfig();
}
