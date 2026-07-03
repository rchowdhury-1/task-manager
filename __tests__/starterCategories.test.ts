import { describe, it, expect } from 'vitest';
import {
  STARTER_CATEGORIES,
  CATEGORY_SLUG_REGEX,
  CATEGORY_COLOUR_STYLES,
  CATEGORY_ICON_EMOJI,
  colourStyle,
  FALLBACK_COLOUR_STYLE,
} from '@/lib/categories';

// Guards the Bug-1 fix: new accounts must get exactly these generic starter
// topics, never anyone's personal category list.
describe('STARTER_CATEGORIES', () => {
  it('is the agreed generic starter set', () => {
    expect(STARTER_CATEGORIES.map(c => c.label)).toEqual([
      'Learning', 'Fitness', 'Errands', 'Projects',
    ]);
  });

  it('contains no personal topics from the old seed', () => {
    const slugs = STARTER_CATEGORIES.map(c => c.slug);
    for (const personal of ['career', 'lms', 'freelance', 'uber', 'faith']) {
      expect(slugs).not.toContain(personal);
    }
  });

  it('every starter has a valid slug, known colour, and known icon', () => {
    for (const c of STARTER_CATEGORIES) {
      expect(c.slug).toMatch(CATEGORY_SLUG_REGEX);
      expect(CATEGORY_COLOUR_STYLES[c.colour]).toBeDefined();
      expect(CATEGORY_ICON_EMOJI[c.icon]).toBeDefined();
    }
  });

  it('has unique slugs and contiguous sort order', () => {
    const slugs = STARTER_CATEGORIES.map(c => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(STARTER_CATEGORIES.map(c => c.sortOrder)).toEqual([0, 1, 2, 3]);
  });
});

describe('colourStyle', () => {
  it('returns the style for a known colour', () => {
    expect(colourStyle('violet')).toBe(CATEGORY_COLOUR_STYLES.violet);
  });

  it('falls back for unknown or missing colours', () => {
    expect(colourStyle('magenta')).toBe(FALLBACK_COLOUR_STYLE);
    expect(colourStyle(null)).toBe(FALLBACK_COLOUR_STYLE);
    expect(colourStyle(undefined)).toBe(FALLBACK_COLOUR_STYLE);
  });
});
