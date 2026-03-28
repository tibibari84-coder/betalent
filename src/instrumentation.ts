/**
 * Runs once per runtime: Sentry (optional) + production config assert.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
    return;
  }
  try {
    const { assertProductionRuntimeConfig } = await import('@/lib/runtime-config');
    assertProductionRuntimeConfig();
  } catch (err) {
    const { logger } = await import('@/lib/logger');
    logger.error('instrumentation_runtime_config_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
