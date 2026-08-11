import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseQuickAdd } from '@/lib/parseQuickAdd';

// The user's topic slugs, as passed by the UI from the categories table
const SLUGS = ['learning', 'fitness', 'errands', 'projects'];

// Frozen reference: Wednesday 2026-08-12. parseQuickAdd calls `new Date()`
// internally (no injectable clock yet — see B13 in the hardening plan),
// so every date-relative expectation below is a hard-coded literal computed
// against this exact instant, not re-derived at runtime. That's the fix:
// the old version of this file called `new Date()` in both the test's
// expected-value helpers AND transitively in the code under test, so a run
// straddling midnight (or DST) could see the two clocks disagree.
describe('parseQuickAdd', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Plain title only
  it('parses plain title', () => {
    const result = parseQuickAdd('Buy milk');
    expect(result.title).toBe('Buy milk');
    expect(result.category).toBeUndefined();
    expect(result.priority).toBeUndefined();
  });

  // 2. Title with a #topic the user owns
  it('parses an owned #topic', () => {
    const result = parseQuickAdd('Build feature #projects', SLUGS);
    expect(result.title).toBe('Build feature');
    expect(result.category).toBe('projects');
  });

  // 3. Custom (user-created) topic slugs work too
  it('parses a custom topic slug', () => {
    const result = parseQuickAdd('Water plants #home-garden', ['home-garden']);
    expect(result.title).toBe('Water plants');
    expect(result.category).toBe('home-garden');
  });

  // 3b. Without a slug list, any slug-shaped tag is accepted (server validates)
  it('accepts any slug-shaped tag when no list is given', () => {
    const result = parseQuickAdd('Study #anything');
    expect(result.category).toBe('anything');
  });

  // 3c. Tag matching is case-insensitive, normalised to lowercase
  it('normalises tag case', () => {
    const result = parseQuickAdd('Run #Fitness', SLUGS);
    expect(result.category).toBe('fitness');
  });

  // 4. Priority !1
  it('parses !1 priority', () => {
    const result = parseQuickAdd('Task !1');
    expect(result.priority).toBe(1);
    expect(result.title).toBe('Task');
  });

  // 5. Priority !2
  it('parses !2 priority', () => {
    const result = parseQuickAdd('Task !2');
    expect(result.priority).toBe(2);
  });

  // 6. Priority !3
  it('parses !3 priority', () => {
    const result = parseQuickAdd('Task !3');
    expect(result.priority).toBe(3);
  });

  // 7. Day: today (frozen at Wed 2026-08-12)
  it('parses today', () => {
    const result = parseQuickAdd('Do thing today');
    expect(result.assignedDay).toBe('2026-08-12');
    expect(result.title).toBe('Do thing');
  });

  // 8. Day: tomorrow (frozen at Wed 2026-08-12)
  it('parses tomorrow', () => {
    const result = parseQuickAdd('Do thing tomorrow');
    expect(result.assignedDay).toBe('2026-08-13');
  });

  // 9. Day: mon (frozen at Wed 2026-08-12 -> next Monday is 2026-08-17)
  it('parses mon as next Monday', () => {
    const result = parseQuickAdd('Do thing mon');
    expect(result.assignedDay).toBe('2026-08-17');
    expect(result.title).toBe('Do thing');
  });

  // 10. Day: fri (frozen at Wed 2026-08-12 -> next Friday is 2026-08-14)
  it('parses fri as next Friday', () => {
    const result = parseQuickAdd('Do thing fri');
    expect(result.assignedDay).toBe('2026-08-14');
  });

  // 11. Duration: 2h
  it('parses 2h duration', () => {
    const result = parseQuickAdd('Task 2h');
    expect(result.durationMinutes).toBe(120);
  });

  // 12. Duration: 90m
  it('parses 90m duration', () => {
    const result = parseQuickAdd('Task 90m');
    expect(result.durationMinutes).toBe(90);
  });

  // 13. Duration: 30min
  it('parses 30min duration', () => {
    const result = parseQuickAdd('Task 30min');
    expect(result.durationMinutes).toBe(30);
  });

  // 14. Duration: 1.5h
  it('parses 1.5h duration', () => {
    const result = parseQuickAdd('Task 1.5h');
    expect(result.durationMinutes).toBe(90);
  });

  // 15. Time: 9am
  it('parses 9am time', () => {
    const result = parseQuickAdd('Task 9am');
    expect(result.scheduledTime).toBe('09:00');
  });

  // 16. Time: 9:30pm
  it('parses 9:30pm time', () => {
    const result = parseQuickAdd('Task 9:30pm');
    expect(result.scheduledTime).toBe('21:30');
  });

  // 17. Time: 21:00
  it('parses 21:00 time', () => {
    const result = parseQuickAdd('Task 21:00');
    expect(result.scheduledTime).toBe('21:00');
  });

  // 18. Full combination
  it('parses full combination', () => {
    const result = parseQuickAdd('Fix bug #learning !1 today 2h 9am', SLUGS);
    expect(result.title).toBe('Fix bug');
    expect(result.category).toBe('learning');
    expect(result.priority).toBe(1);
    expect(result.assignedDay).toBe('2026-08-12');
    expect(result.durationMinutes).toBe(120);
    expect(result.scheduledTime).toBe('09:00');
  });

  // 19. Tag not in the user's topics stays in the title
  it('keeps a non-owned #tag in the title', () => {
    const result = parseQuickAdd('Task #unknown', SLUGS);
    expect(result.title).toBe('Task #unknown');
    expect(result.category).toBeUndefined();
  });

  // 20. Extra spaces trimmed
  it('trims extra spaces', () => {
    const result = parseQuickAdd('  extra  spaces  ');
    expect(result.title).toBe('extra spaces');
  });
});

// Boundary cases the old real-clock version could never reliably exercise —
// "tomorrow" crossing a month/year rollover is exactly where naive date
// arithmetic (e.g. string month/day concatenation) breaks.
describe('parseQuickAdd — date boundaries', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls "tomorrow" over a month boundary (Aug 31 -> Sep 1)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T10:00:00'));
    const result = parseQuickAdd('Do thing tomorrow');
    expect(result.assignedDay).toBe('2026-09-01');
  });

  it('rolls "tomorrow" over a year boundary (Dec 31 -> Jan 1)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T10:00:00'));
    const result = parseQuickAdd('Do thing tomorrow');
    expect(result.assignedDay).toBe('2027-01-01');
  });
});
