import { describe, it, expect } from 'vitest';
import { generateICS, formatUTC, escapeText, foldLine } from '@/lib/calendar/ics';

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
    // Continuation lines start with a space
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i][0]).toBe(' ');
      expect(parts[i].length).toBeLessThanOrEqual(75);
    }
  });
});

describe('generateICS', () => {
  it('produces valid VCALENDAR structure', () => {
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

    // Every line should end with \r\n
    const lines = ics.split('\r\n');
    expect(lines.length).toBeGreaterThan(5);
    // Last element after final \r\n is empty string
    expect(lines[lines.length - 1]).toBe('');
  });
});
