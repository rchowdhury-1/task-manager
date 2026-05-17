import { describe, it, expect } from 'vitest';
import { checkRegisterRateLimit } from '@/lib/auth/registerRateLimiter';

describe('checkRegisterRateLimit', () => {
  it('allows first registration attempt', () => {
    const result = checkRegisterRateLimit('192.168.1.100');
    expect(result.allowed).toBe(true);
  });

  it('allows up to 5 attempts within an hour', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < 5; i++) {
      const result = checkRegisterRateLimit(ip);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks after 5 attempts from same IP', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 5; i++) {
      checkRegisterRateLimit(ip);
    }
    const result = checkRegisterRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
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
});

describe('trial calculation', () => {
  it('computes 90 days from now', () => {
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(daysLeft).toBe(90);
  });
});
