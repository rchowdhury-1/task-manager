import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/utils/slugify';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Glass Gardens')).toBe('glass-gardens');
  });

  it('strips punctuation', () => {
    expect(slugify("Chaayé Paani's Menu!")).toBe('chaay-paani-s-menu');
  });

  it('collapses runs of non-alphanumeric characters into one hyphen', () => {
    expect(slugify('a   -- b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -Leading and trailing-  ')).toBe('leading-and-trailing');
  });

  it('handles an already-slug-shaped input as identity', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });
});
