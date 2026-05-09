import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from '@/lib/parseQuickAdd';

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function nextWeekday(target: number): string {
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return toISODate(d);
}

describe('parseQuickAdd', () => {
  // 1. Plain title only
  it('parses plain title', () => {
    const result = parseQuickAdd('Buy milk');
    expect(result.title).toBe('Buy milk');
    expect(result.category).toBeUndefined();
    expect(result.priority).toBeUndefined();
  });

  // 2. Title with #category
  it('parses #career category', () => {
    const result = parseQuickAdd('Build feature #career');
    expect(result.title).toBe('Build feature');
    expect(result.category).toBe('career');
  });

  // 3. Title with #lms category
  it('parses #lms category', () => {
    const result = parseQuickAdd('Study #lms');
    expect(result.title).toBe('Study');
    expect(result.category).toBe('lms');
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
    const result = parseQuickAdd('Fix bug #career !1 today 2h 9am');
    expect(result.title).toBe('Fix bug');
    expect(result.category).toBe('career');
    expect(result.priority).toBe(1);
    expect(result.assignedDay).toBe(toISODate(new Date()));
    expect(result.durationMinutes).toBe(120);
    expect(result.scheduledTime).toBe('09:00');
  });

  // 19. Invalid category stays in title
  it('keeps #unknown in title', () => {
    const result = parseQuickAdd('Task #unknown');
    expect(result.title).toBe('Task #unknown');
    expect(result.category).toBeUndefined();
  });

  // 20. Extra spaces trimmed
  it('trims extra spaces', () => {
    const result = parseQuickAdd('  extra  spaces  ');
    expect(result.title).toBe('extra spaces');
  });
});
