import { timingSafeEqual } from 'crypto';

// Cron routes must fail CLOSED: if CRON_SECRET is unset, `Bearer undefined`
// would otherwise authenticate anyone. Comparison is constant-time.
export function isAuthorizedCronRequest(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
