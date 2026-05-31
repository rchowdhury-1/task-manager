/**
 * Centralised timezone utilities. All timezone math goes through these functions.
 */

/**
 * Construct a UTC Date from local wall-clock components in a given IANA timezone.
 *
 * Example: localToUTC('2026-06-01', '18:00', 'Europe/London')
 * returns Date representing 17:00 UTC (6pm BST = UTC+1).
 */
export function localToUTC(
  dayISO: string,
  timeHHMM: string,
  timezone: string,
): Date {
  const [year, month, day] = dayISO.split('-').map(Number);
  const [hour, minute] = timeHHMM.split(':').map(Number);

  // Start with a naive UTC interpretation
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Compute what THIS UTC moment looks like in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(naiveUtc);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value || 0);

  // The difference between intended local and observed local is the offset
  const observedUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMs = intendedUtc - observedUtc;

  return new Date(naiveUtc.getTime() + offsetMs);
}

/**
 * Get the local wall-clock components for a UTC Date in a given IANA timezone.
 */
export function utcToLocalParts(
  utcDate: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * Get today's date string (YYYY-MM-DD) in a given IANA timezone.
 */
export function todayInTimezone(timezone: string): string {
  const parts = utcToLocalParts(new Date(), timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/**
 * Get current hour in user's timezone (0-23).
 */
export function currentHourInTimezone(timezone: string): number {
  return utcToLocalParts(new Date(), timezone).hour;
}

/**
 * Validate an IANA timezone string.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a Date in the user's timezone as YYYY-MM-DD.
 */
export function dateInTimezone(date: Date, timezone: string): string {
  const parts = utcToLocalParts(date, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
