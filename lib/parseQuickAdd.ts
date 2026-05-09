type Category = 'career' | 'lms' | 'freelance' | 'learning' | 'uber' | 'faith';

export interface ParsedTask {
  title: string;
  category?: Category;
  priority?: 1 | 2 | 3;
  assignedDay?: string;
  scheduledTime?: string;
  durationMinutes?: number;
}

const CATEGORIES: Category[] = ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'];
const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

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

export function parseQuickAdd(text: string): ParsedTask {
  let remaining = text;
  let category: Category | undefined;
  let priority: 1 | 2 | 3 | undefined;
  let assignedDay: string | undefined;
  let scheduledTime: string | undefined;
  let durationMinutes: number | undefined;

  // Category: #career etc
  for (const cat of CATEGORIES) {
    const re = new RegExp(`#${cat}\\b`, 'i');
    if (re.test(remaining)) {
      category = cat;
      remaining = remaining.replace(re, '').trim();
      break;
    }
  }

  // Priority: !1 !2 !3
  const priMatch = remaining.match(/!([123])\b/);
  if (priMatch) {
    priority = parseInt(priMatch[1]) as 1 | 2 | 3;
    remaining = remaining.replace(priMatch[0], '').trim();
  }

  // Day: today, tomorrow, mon–sun
  const today = new Date();
  const todayMatch = remaining.match(/\btoday\b/i);
  const tomorrowMatch = remaining.match(/\btomorrow\b/i);
  if (todayMatch) {
    assignedDay = toISODate(today);
    remaining = remaining.replace(todayMatch[0], '').trim();
  } else if (tomorrowMatch) {
    const t = new Date(today);
    t.setDate(today.getDate() + 1);
    assignedDay = toISODate(t);
    remaining = remaining.replace(tomorrowMatch[0], '').trim();
  } else {
    const dayMatch = remaining.match(/\b(mon|tue|wed|thu|fri|sat|sun)\b/i);
    if (dayMatch) {
      assignedDay = nextWeekday(DAY_MAP[dayMatch[1].toLowerCase()]);
      remaining = remaining.replace(dayMatch[0], '').trim();
    }
  }

  // Duration: 1h 2h 30m 90min
  const durMatch = remaining.match(/\b(\d+(?:\.\d+)?)(h|min|m)\b/i);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    durationMinutes = unit === 'h' ? Math.round(val * 60) : Math.round(val);
    remaining = remaining.replace(durMatch[0], '').trim();
  }

  // Time: 9am 10:30am 9pm 21:00
  const timeMatch = remaining.match(/\b(\d{1,2})(?::(\d{2}))?(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      scheduledTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      remaining = remaining.replace(timeMatch[0], '').trim();
    }
  }

  return {
    title: remaining.replace(/\s+/g, ' ').trim(),
    category,
    priority,
    assignedDay,
    scheduledTime,
    durationMinutes,
  };
}
