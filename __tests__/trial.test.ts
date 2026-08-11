import { describe, it, expect } from 'vitest';
import { trialEndDate, TRIAL_DAYS } from '@/lib/auth/trial';

describe('trialEndDate', () => {
  it('is exactly TRIAL_DAYS after the given reference time', () => {
    const now = new Date('2026-08-11T00:00:00Z');
    const result = trialEndDate(now);
    expect(result.toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });

  it('defaults to the current time when no reference is given', () => {
    const before = Date.now();
    const result = trialEndDate();
    const after = Date.now();

    const expectedMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
    expect(result.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
    expect(result.getTime()).toBeLessThanOrEqual(after + expectedMs);
  });

  it('crosses a year boundary correctly', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const result = trialEndDate(now);
    expect(result.getUTCFullYear()).toBe(2027);
  });
});
