import { Prisma } from '@prisma/client';

/** Connection / pool / timeout — map to 503 on hot routes. */
const TRANSIENT_DB_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server unreachable
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_DB_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const name = error instanceof Error ? error.name : '';
  return name === 'PrismaClientInitializationError';
}
