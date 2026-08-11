import { describe, it, expect, beforeEach } from 'vitest';
import { checkRegisterRateLimit, resetRegisterRateLimiter } from '@/lib/auth/registerRateLimiter';

describe('checkRegisterRateLimit', () => {
  beforeEach(() => {
    resetRegisterRateLimiter();
  });

  it('allows first registration attempt', () => {
    const result = checkRegisterRateLimit('192.168.1.100');
    expect(result.allowed).toBe(true);
  });

  it('allows exactly 5 attempts then blocks the 6th, from the same IP', () => {
    const ip = '10.0.0.1';
    const results = Array.from({ length: 6 }, (_, i) => ({
      attempt: i + 1,
      ...checkRegisterRateLimit(ip),
    }));

    expect(results).toEqual([
      { attempt: 1, allowed: true },
      { attempt: 2, allowed: true },
      { attempt: 3, allowed: true },
      { attempt: 4, allowed: true },
      { attempt: 5, allowed: true },
      { attempt: 6, allowed: false, retryAfter: expect.any(Number) },
    ]);
    expect(results[5].retryAfter).toBeGreaterThan(0);
  });

  it('allows different IPs independently', () => {
    const ip1 = '10.0.0.3';
    const ip2 = '10.0.0.4';
    for (let i = 0; i < 5; i++) {
      checkRegisterRateLimit(ip1);
    }
    const result = checkRegisterRateLimit(ip2);
    expect(result.allowed).toBe(true);
  });

  it('resetRegisterRateLimiter clears tracked attempts', () => {
    const ip = '10.0.0.5';
    for (let i = 0; i < 5; i++) {
      checkRegisterRateLimit(ip);
    }
    expect(checkRegisterRateLimit(ip).allowed).toBe(false);

    resetRegisterRateLimiter();

    expect(checkRegisterRateLimit(ip).allowed).toBe(true);
  });
});
