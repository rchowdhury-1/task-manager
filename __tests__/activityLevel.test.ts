import { describe, it, expect } from 'vitest';
import { activityLevel } from '@/lib/utils/activityLevel';

describe('activityLevel', () => {
  it('returns 0 for no events', () => {
    expect(activityLevel(0)).toBe(0);
  });

  it('returns 1 for 1-2 events', () => {
    expect(activityLevel(1)).toBe(1);
    expect(activityLevel(2)).toBe(1);
  });

  it('returns 2 for 3-5 events', () => {
    expect(activityLevel(3)).toBe(2);
    expect(activityLevel(5)).toBe(2);
  });

  it('returns 3 for 6+ events', () => {
    expect(activityLevel(6)).toBe(3);
    expect(activityLevel(100)).toBe(3);
  });
});
