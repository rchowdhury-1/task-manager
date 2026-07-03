// Postgres unique-constraint violation (error code 23505). Drizzle surfaces
// the pg driver error, sometimes wrapped with a `cause`.
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === '23505' || e.cause?.code === '23505';
}
