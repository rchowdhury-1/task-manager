import { describe, it, expect } from 'vitest';
import {
  localToUTC,
  utcToLocalParts,
  todayInTimezone,
  currentHourInTimezone,
  isValidTimezone,
  dateInTimezone,
} from '@/lib/utils/timezone';

describe('localToUTC', () => {
  it('converts BST (UTC+1) correctly — 6pm BST → 5pm UTC', () => {
    // June 1 2026 is BST (UTC+1)
    const result = localToUTC('2026-06-01', '18:00', 'Europe/London');
    expect(result.getUTCHours()).toBe(17);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5); // 0-indexed
    expect(result.getUTCDate()).toBe(1);
  });

  it('converts GMT (UTC+0) correctly — 6pm GMT → 6pm UTC', () => {
    // January 15 2026 is GMT (UTC+0) for Europe/London
    const result = localToUTC('2026-01-15', '18:00', 'Europe/London');
    expect(result.getUTCHours()).toBe(18);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('converts US Eastern DST (UTC-4) correctly — 3pm EDT → 7pm UTC', () => {
    // July 4 2026 is EDT (UTC-4)
    const result = localToUTC('2026-07-04', '15:00', 'America/New_York');
    expect(result.getUTCHours()).toBe(19);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('converts US Eastern standard (UTC-5) correctly — 3pm EST → 8pm UTC', () => {
    // January 15 2026 is EST (UTC-5)
    const result = localToUTC('2026-01-15', '15:00', 'America/New_York');
    expect(result.getUTCHours()).toBe(20);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('handles midnight correctly', () => {
    const result = localToUTC('2026-06-01', '00:00', 'Europe/London');
    // Midnight BST = 23:00 previous day UTC
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCDate()).toBe(31); // May 31
    expect(result.getUTCMonth()).toBe(4); // May
  });

  it('handles DST transition day (spring forward) in Europe/London', () => {
    // 2026 UK clocks go forward on March 29
    // 1am on March 29 is still GMT (UTC+0), 2am doesn't exist, clocks jump to 3am BST
    const result = localToUTC('2026-03-29', '03:00', 'Europe/London');
    // 3am BST = 2am UTC
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCDate()).toBe(29);
  });

  it('handles UTC timezone as identity', () => {
    const result = localToUTC('2026-06-01', '14:30', 'UTC');
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
    expect(result.getUTCDate()).toBe(1);
  });
});

describe('utcToLocalParts', () => {
  it('is the inverse of localToUTC for BST', () => {
    const utcDate = localToUTC('2026-06-01', '18:00', 'Europe/London');
    const parts = utcToLocalParts(utcDate, 'Europe/London');
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(6);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBe(18);
    expect(parts.minute).toBe(0);
  });

  it('is the inverse of localToUTC for US Eastern', () => {
    const utcDate = localToUTC('2026-07-04', '09:30', 'America/New_York');
    const parts = utcToLocalParts(utcDate, 'America/New_York');
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(7);
    expect(parts.day).toBe(4);
    expect(parts.hour).toBe(9);
    expect(parts.minute).toBe(30);
  });

  it('handles crossing midnight boundary', () => {
    // 11pm UTC on June 1 is midnight BST on June 2
    const utcDate = new Date(Date.UTC(2026, 5, 1, 23, 0, 0));
    const parts = utcToLocalParts(utcDate, 'Europe/London');
    expect(parts.day).toBe(2);
    expect(parts.hour).toBe(0);
  });
});

describe('todayInTimezone', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayInTimezone('Europe/London');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a valid date for UTC', () => {
    const result = todayInTimezone('UTC');
    const [y, m, d] = result.split('-').map(Number);
    expect(y).toBeGreaterThan(2020);
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(12);
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(31);
  });
});

describe('currentHourInTimezone', () => {
  it('returns a valid hour (0-23)', () => {
    const h = currentHourInTimezone('America/New_York');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });
});

describe('isValidTimezone', () => {
  it('returns true for valid IANA timezones', () => {
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
  });

  it('returns false for invalid timezone strings', () => {
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(isValidTimezone('Invalid')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });
});

describe('dateInTimezone', () => {
  it('formats UTC date correctly for a given timezone', () => {
    // June 1 2026, 23:00 UTC = June 2 2026, 00:00 BST
    const utcDate = new Date(Date.UTC(2026, 5, 1, 23, 0, 0));
    expect(dateInTimezone(utcDate, 'Europe/London')).toBe('2026-06-02');
    expect(dateInTimezone(utcDate, 'UTC')).toBe('2026-06-01');
  });
});
