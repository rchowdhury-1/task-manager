import { describe, it, expect } from 'vitest';
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('returns valid PWA manifest with required fields', () => {
    const m = manifest();
    expect(m.name).toBe('Personal OS');
    expect(m.short_name).toBe('Personal OS');
    expect(m.start_url).toBe('/today');
    expect(m.display).toBe('standalone');
    expect(m.icons).toHaveLength(4);
    expect(m.icons![0].sizes).toBe('192x192');
    expect(m.icons![1].sizes).toBe('512x512');
    expect(m.icons![2].purpose).toBe('maskable');
    expect(m.icons![3].purpose).toBe('maskable');
  });
});
