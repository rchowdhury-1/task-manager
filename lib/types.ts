// ─── Enums ───────────────────────────────────────────────────────────────────

export type Category = 'career' | 'lms' | 'freelance' | 'learning' | 'uber' | 'faith';
export type Priority = 1 | 2 | 3;
export type Status = 'backlog' | 'this_week' | 'in_progress' | 'done';
export type DayFocus = 'job_hunt' | 'lms' | 'freelance' | 'learning' | 'rest' | 'flex';
export type Section = 'faith' | 'body' | 'growth';

// ─── API response shapes (match Drizzle camelCase output) ────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  priority: Priority;
  assignedDay: string | null;
  scheduledTime: string | null;
  durationMinutes: number;
  timeLoggedMinutes: number;
  lastLeftOff: string | null;
  nextSteps: { text: string; done: boolean }[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  section: Section;
  timeOfDay: string | null;
  daysOfWeek: number[];
  active: boolean;
  createdAt: string;
}

export interface HabitCompletion {
  habit_id: string;
  date: string;
}

export interface DayRule {
  id: string | null;
  userId: string;
  dayOfWeek: number;
  focusArea: DayFocus;
  maxFocusHours: number;
}

export interface RecurringTask {
  id: string;
  userId: string;
  title: string;
  category: Category;
  priority: Priority;
  durationMinutes: number;
  scheduledTime: string | null;
  daysOfWeek: number[];
  active: boolean;
  untilCondition: string | null;
  createdAt: string;
}

export interface TodayPayload {
  date: string;
  dayOfWeek: number;
  dayRule: DayRule;
  tasks: Task[];
  recurring: RecurringTask[];
  habits: Habit[];
  completions: HabitCompletion[];
}
