import { describe, it, expect } from 'vitest';
import { addDaysISO, weekRangeLabel, isToday, todayISO, dayNumber, dayNameShort, formatTimeShort, addTime } from '@/lib/utils/dates';

describe('addDaysISO', () => {
  it('adds positive days', () => {
    expect(addDaysISO('2026-05-05', 3)).toBe('2026-05-08');
  });

  it('subtracts negative days', () => {
    expect(addDaysISO('2026-05-10', -5)).toBe('2026-05-05');
  });

  it('crosses month boundary', () => {
    expect(addDaysISO('2026-01-30', 3)).toBe('2026-02-02');
  });
});

describe('weekRangeLabel', () => {
  it('formats a week range from Monday', () => {
    const label = weekRangeLabel('2026-05-04');
    expect(label).toBe('4 May - 10 May 2026');
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(todayISO())).toBe(true);
  });

  it('returns false for other dates', () => {
    expect(isToday('2020-01-01')).toBe(false);
  });
});

describe('dayNumber', () => {
  it('extracts day number', () => {
    expect(dayNumber('2026-05-09')).toBe('9');
  });

  it('does not zero-pad', () => {
    expect(dayNumber('2026-05-01')).toBe('1');
  });
});

describe('dayNameShort', () => {
  it('returns uppercase 3-letter day', () => {
    // 2026-05-04 is Monday
    expect(dayNameShort('2026-05-04')).toBe('MON');
  });

  it('returns correct day for Sunday', () => {
    // 2026-05-10 is Sunday
    expect(dayNameShort('2026-05-10')).toBe('SUN');
  });
});

describe('formatTimeShort', () => {
  it('formats morning time without minutes', () => {
    expect(formatTimeShort('09:00')).toBe('9am');
  });

  it('formats afternoon time with minutes', () => {
    expect(formatTimeShort('13:30')).toBe('1:30pm');
  });

  it('formats midnight', () => {
    expect(formatTimeShort('00:00')).toBe('12am');
  });

  it('formats noon', () => {
    expect(formatTimeShort('12:00')).toBe('12pm');
  });
});

describe('addTime', () => {
  it('adds minutes within same hour', () => {
    expect(addTime('09:00', 30)).toBe('09:30');
  });

  it('adds minutes crossing hours', () => {
    expect(addTime('09:00', 120)).toBe('11:00');
  });

  it('wraps around midnight', () => {
    expect(addTime('23:00', 120)).toBe('01:00');
  });
});
