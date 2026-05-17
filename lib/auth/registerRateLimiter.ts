// In-memory rate limiter for registration endpoint.
// Resets on server restart. Sufficient for early launch.
// Production-grade: use Redis / Upstash (Phase 9+).

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

export function checkRegisterRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_PER_HOUR) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
