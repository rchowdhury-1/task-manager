import { describe, it, expect } from 'vitest';
import { haptic } from '@/lib/haptics';

describe('haptic', () => {
  it('does not crash in non-browser environment', () => {
    // In node environment (no window), haptic exits early without error
    expect(() => haptic('light')).not.toThrow();
    expect(() => haptic('success')).not.toThrow();
    expect(() => haptic('error')).not.toThrow();
    expect(() => haptic('medium')).not.toThrow();
    expect(() => haptic('heavy')).not.toThrow();
    expect(() => haptic('warning')).not.toThrow();
  });
});
