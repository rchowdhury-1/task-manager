import { describe, it, expect } from 'vitest';
import { quoteFor, HABIT_QUOTES } from '@/lib/notifications/quotes';

describe('quoteFor', () => {
  it('returns a valid quote for a given date and slot', () => {
    const quote = quoteFor(new Date('2026-03-15'), 'morning');
    expect(quote).toHaveProperty('text');
    expect(quote.text.length).toBeGreaterThan(0);
    expect(HABIT_QUOTES).toContain(quote);
  });

  it('returns different quotes for morning and evening on same day', () => {
    const date = new Date('2026-06-01');
    const morning = quoteFor(date, 'morning');
    const evening = quoteFor(date, 'evening');
    expect(morning).not.toEqual(evening);
  });

  it('cycles through all quotes over time', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 365; day++) {
      const date = new Date(2026, 0, 1 + day);
      seen.add(quoteFor(date, 'morning').text);
    }
    // All 12 quotes should appear at least once over a year
    expect(seen.size).toBe(HABIT_QUOTES.length);
  });

  it('is deterministic — same input produces same output', () => {
    const date = new Date('2026-04-20');
    const a = quoteFor(date, 'morning');
    const b = quoteFor(date, 'morning');
    expect(a).toEqual(b);
  });
});
