/**
 * Lightweight RFC 5545 iCalendar (.ics) generator for task events.
 */

export interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  dtStart: Date;
  dtEnd: Date;
  createdAt?: Date;
  /** IANA timezone for TZID-qualified output. If omitted, uses UTC format. */
  timezone?: string;
  /** Local wall-clock start time (used with timezone for TZID output) */
  localStart?: { year: number; month: number; day: number; hour: number; minute: number };
  /** Local wall-clock end time (used with timezone for TZID output) */
  localEnd?: { year: number; month: number; day: number; hour: number; minute: number };
}

export function generateICS(event: ICSEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PersonalOS//TaskExport//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
  ];

  // Use TZID-qualified local time when timezone + local times are provided
  if (event.timezone && event.localStart && event.localEnd) {
    lines.push(`DTSTART;TZID=${event.timezone}:${formatLocal(event.localStart)}`);
    lines.push(`DTEND;TZID=${event.timezone}:${formatLocal(event.localEnd)}`);
  } else {
    lines.push(`DTSTART:${formatUTC(event.dtStart)}`);
    lines.push(`DTEND:${formatUTC(event.dtEnd)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.createdAt) {
    lines.push(`CREATED:${formatUTC(event.createdAt)}`);
  }

  lines.push(`DTSTAMP:${formatUTC(new Date())}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Format local wall-clock parts as: 20260601T180000 (no Z suffix) */
export function formatLocal(parts: { year: number; month: number; day: number; hour: number; minute: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}00`;
}

/** Format a Date as UTC timestamp: 20240115T093000Z */
export function formatUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/** Escape special characters per RFC 5545 */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Fold lines longer than 75 octets per RFC 5545 */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  parts.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join('\r\n');
}
