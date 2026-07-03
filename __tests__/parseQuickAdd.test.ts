import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from '@/lib/parseQuickAdd';

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextWeekday(target: number): string {
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return toISODate(d);
}

// The user's topic slugs, as passed by the UI from the categories table
const SLUGS = ['learning', 'fitness', 'errands', 'projects'];

describe('parseQuickAdd', () => {
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

  // 7. Day: today
  it('parses today', () => {
    const result = parseQuickAdd('Do thing today');
    expect(result.assignedDay).toBe(toISODate(new Date()));
    expect(result.title).toBe('Do thing');
  });

  // 8. Day: tomorrow
  it('parses tomorrow', () => {
    const result = parseQuickAdd('Do thing tomorrow');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result.assignedDay).toBe(toISODate(tomorrow));
  });

  // 9. Day: mon
  it('parses mon as next Monday', () => {
    const result = parseQuickAdd('Do thing mon');
    expect(result.assignedDay).toBe(nextWeekday(1));
    expect(result.title).toBe('Do thing');
  });

  // 10. Day: fri
  it('parses fri as next Friday', () => {
    const result = parseQuickAdd('Do thing fri');
    expect(result.assignedDay).toBe(nextWeekday(5));
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
    expect(result.assignedDay).toBe(toISODate(new Date()));
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
