import { describe, it, expect } from 'vitest';
import { generateICS, formatUTC, formatLocal, escapeText, foldLine } from '@/lib/calendar/ics';

describe('formatUTC', () => {
  it('formats a date as UTC timestamp', () => {
    const d = new Date('2025-03-15T14:30:00Z');
    expect(formatUTC(d)).toBe('20250315T143000Z');
  });

  it('pads single digits', () => {
    const d = new Date('2025-01-05T09:05:03Z');
    expect(formatUTC(d)).toBe('20250105T090503Z');
  });
});

describe('formatLocal', () => {
  it('formats local parts without Z suffix', () => {
    expect(formatLocal({ year: 2026, month: 6, day: 1, hour: 18, minute: 0 }))
      .toBe('20260601T180000');
  });

  it('pads single digits', () => {
    expect(formatLocal({ year: 2026, month: 1, day: 5, hour: 9, minute: 5 }))
      .toBe('20260105T090500');
  });
});

describe('escapeText', () => {
  it('escapes backslash, semicolon, comma, newline', () => {
    expect(escapeText('hello\\world')).toBe('hello\\\\world');
    expect(escapeText('a;b,c\nd')).toBe('a\\;b\\,c\\nd');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeText('Simple task')).toBe('Simple task');
  });
});

describe('foldLine', () => {
  it('does not fold short lines', () => {
    const line = 'SUMMARY:Short task';
    expect(foldLine(line)).toBe(line);
  });

  it('folds lines longer than 75 octets', () => {
    const line = 'DESCRIPTION:' + 'A'.repeat(100);
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].length).toBe(75);
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i][0]).toBe(' ');
      expect(parts[i].length).toBeLessThanOrEqual(75);
    }
  });
});

describe('generateICS', () => {
  it('produces valid VCALENDAR structure (UTC mode)', () => {
    const ics = generateICS({
      uid: 'test-123@personalos.app',
      summary: 'Build feature',
      dtStart: new Date('2025-06-01T10:00:00Z'),
      dtEnd: new Date('2025-06-01T11:00:00Z'),
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('UID:test-123@personalos.app');
    expect(ics).toContain('SUMMARY:Build feature');
    expect(ics).toContain('DTSTART:20250601T100000Z');
    expect(ics).toContain('DTEND:20250601T110000Z');
  });

  it('includes description when provided', () => {
    const ics = generateICS({
      uid: 'test-456@personalos.app',
      summary: 'My task',
      description: 'Details here',
      dtStart: new Date('2025-06-01T10:00:00Z'),
      dtEnd: new Date('2025-06-01T11:00:00Z'),
    });

    expect(ics).toContain('DESCRIPTION:Details here');
  });

  it('omits description when not provided', () => {
    const ics = generateICS({
      uid: 'test-789@personalos.app',
      summary: 'No desc',
      dtStart: new Date('2025-06-01T10:00:00Z'),
      dtEnd: new Date('2025-06-01T11:00:00Z'),
    });

    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('uses CRLF line endings', () => {
    const ics = generateICS({
      uid: 'test@personalos.app',
      summary: 'CRLF test',
      dtStart: new Date('2025-06-01T10:00:00Z'),
      dtEnd: new Date('2025-06-01T11:00:00Z'),
    });

    const lines = ics.split('\r\n');
    expect(lines.length).toBeGreaterThan(5);
    expect(lines[lines.length - 1]).toBe('');
  });

  it('generates TZID-qualified DTSTART/DTEND when timezone and local times provided', () => {
    const ics = generateICS({
      uid: 'tz-test@personalos.app',
      summary: '6pm BST task',
      dtStart: new Date('2026-06-01T17:00:00Z'), // 5pm UTC = 6pm BST
      dtEnd: new Date('2026-06-01T18:00:00Z'),
      timezone: 'Europe/London',
      localStart: { year: 2026, month: 6, day: 1, hour: 18, minute: 0 },
      localEnd: { year: 2026, month: 6, day: 1, hour: 19, minute: 0 },
    });

    expect(ics).toContain('DTSTART;TZID=Europe/London:20260601T180000');
    expect(ics).toContain('DTEND;TZID=Europe/London:20260601T190000');
    // Should NOT contain UTC format for start/end
    expect(ics).not.toContain('DTSTART:2026');
  });

  it('falls back to UTC format when timezone not provided', () => {
    const ics = generateICS({
      uid: 'utc-test@personalos.app',
      summary: 'UTC task',
      dtStart: new Date('2026-06-01T17:00:00Z'),
      dtEnd: new Date('2026-06-01T18:00:00Z'),
    });

    expect(ics).toContain('DTSTART:20260601T170000Z');
    expect(ics).toContain('DTEND:20260601T180000Z');
  });
});
