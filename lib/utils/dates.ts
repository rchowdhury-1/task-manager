import { format, parseISO, startOfWeek, addDays as dfAddDays } from 'date-fns';

/** YYYY-MM-DD for user's local date */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday of the week containing the given YYYY-MM-DD date */
export function mondayOf(dateStr: string): string {
  const d = parseISO(dateStr);
  const mon = startOfWeek(d, { weekStartsOn: 1 });
  return format(mon, 'yyyy-MM-dd');
}

/** Array of 7 ISO strings Mon–Sun for the week containing the given date */
export function weekDays(dateStr?: string): string[] {
  const ref = dateStr ? parseISO(dateStr) : new Date();
  const mon = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(dfAddDays(mon, i), 'yyyy-MM-dd'));
}

/** "21:00" → "9pm", "09:30" → "9:30am", "13:00" → "1pm" */
export function formatTimeShort(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Today as "Saturday, 9 May 2026" */
export function longDate(): string {
  return format(new Date(), 'EEEE, d MMMM yyyy');
}

/** ISO string n days later/earlier */
export function addDaysISO(iso: string, n: number): string {
  return format(dfAddDays(parseISO(iso), n), 'yyyy-MM-dd');
}

/** "12 May - 18 May 2026" from a Monday ISO string */
export function weekRangeLabel(mondayISO: string): string {
  const mon = parseISO(mondayISO);
  const sun = dfAddDays(mon, 6);
  return `${format(mon, 'd MMM')} - ${format(sun, 'd MMM yyyy')}`;
}

/** Whether the given ISO string matches today */
export function isToday(iso: string): boolean {
  return iso === todayISO();
}

/** Format ISO date for column header: "12" */
export function dayNumber(iso: string): string {
  return format(parseISO(iso), 'd');
}

/** 3-letter day name uppercase: "MON" */
export function dayNameShort(iso: string): string {
  return format(parseISO(iso), 'EEE').toUpperCase();
}

/** Add duration to a time string: addTime("09:00", 120) → "11:00" */
export function addTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
