import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  tasks,
  habits,
  habitCompletions,
  dayRules,
  recurringTasks,
} from '@/lib/db/schema';
import type { DB } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

type ExecutorFn = (
  userId: string,
  args: Record<string, unknown>,
  db: DB,
) => Promise<ToolResult>;

// ─── Shared enums ───────────────────────────────────────────────────────────

const CATEGORIES = ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'] as const;
const STATUSES = ['backlog', 'this_week', 'in_progress', 'done'] as const;
const SECTIONS = ['faith', 'body', 'growth'] as const;
const TIMES_OF_DAY = ['morning', 'evening', 'anytime'] as const;
const FOCUS_AREAS = ['job_hunt', 'lms', 'freelance', 'learning', 'rest', 'flex'] as const;

// ─── Schemas (lightweight, AI-facing) ───────────────────────────────────────

const createTaskArgs = z.object({
  title: z.string().min(1).max(500),
  category: z.enum(CATEGORIES).default('career'),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  status: z.enum(STATUSES).default('backlog'),
  assigned_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().min(1).max(1440).default(60),
  last_left_off: z.string().optional(),
  notes: z.string().optional(),
});

const updateTaskArgs = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  status: z.enum(STATUSES).optional(),
  assigned_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  last_left_off: z.string().optional(),
  notes: z.string().optional(),
});

const idArg = z.object({ id: z.string().uuid() });

const logTimeArgs = z.object({
  id: z.string().uuid(),
  minutes: z.number().int().min(1),
});

const createHabitArgs = z.object({
  name: z.string().min(1).max(200),
  section: z.enum(SECTIONS).default('growth'),
  time_of_day: z.enum(TIMES_OF_DAY).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
});

const completeHabitArgs = z.object({
  habit_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const setDayRuleArgs = z.object({
  day_of_week: z.number().int().min(0).max(6),
  focus_area: z.enum(FOCUS_AREAS),
  max_focus_hours: z.number().int().min(0).max(24).default(8),
});

const createRecurringArgs = z.object({
  title: z.string().min(1).max(500),
  category: z.enum(CATEGORIES).default('career'),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  duration_minutes: z.number().int().min(1).max(1440).default(60),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)),
  until_condition: z.string().optional(),
});

// ─── Executor implementations ───────────────────────────────────────────────

async function createTask(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = createTaskArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const [task] = await db.insert(tasks).values({
    userId,
    title: d.title,
    category: d.category,
    priority: d.priority,
    status: d.status,
    assignedDay: d.assigned_day,
    scheduledTime: d.scheduled_time,
    durationMinutes: d.duration_minutes,
    lastLeftOff: d.last_left_off,
    notes: d.notes,
  }).returning();
  return { ok: true, data: { id: task.id, title: task.title } };
}

async function updateTask(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = updateTaskArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...fields } = parsed.data;

  // Build set object with only provided fields
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.title !== undefined) set.title = fields.title;
  if (fields.category !== undefined) set.category = fields.category;
  if (fields.priority !== undefined) set.priority = fields.priority;
  if (fields.status !== undefined) set.status = fields.status;
  if (fields.assigned_day !== undefined) set.assignedDay = fields.assigned_day;
  if (fields.scheduled_time !== undefined) set.scheduledTime = fields.scheduled_time;
  if (fields.duration_minutes !== undefined) set.durationMinutes = fields.duration_minutes;
  if (fields.last_left_off !== undefined) set.lastLeftOff = fields.last_left_off;
  if (fields.notes !== undefined) set.notes = fields.notes;

  const [updated] = await db.update(tasks)
    .set(set)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  if (!updated) return { ok: false, error: `Task ${id} not found` };
  return { ok: true, data: { id: updated.id, title: updated.title } };
}

async function deleteTask(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = idArg.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [deleted] = await db.delete(tasks)
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id, title: tasks.title });

  if (!deleted) return { ok: false, error: `Task ${parsed.data.id} not found` };
  return { ok: true, data: { id: deleted.id, title: deleted.title, deleted: true } };
}

async function completeTask(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = idArg.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [updated] = await db.update(tasks)
    .set({ status: 'done', updatedAt: new Date() })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id, title: tasks.title });

  if (!updated) return { ok: false, error: `Task ${parsed.data.id} not found` };
  return { ok: true, data: { id: updated.id, title: updated.title, status: 'done' } };
}

async function logTime(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = logTimeArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [updated] = await db.update(tasks)
    .set({
      timeLoggedMinutes: sql`${tasks.timeLoggedMinutes} + ${parsed.data.minutes}`,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id, title: tasks.title, timeLoggedMinutes: tasks.timeLoggedMinutes });

  if (!updated) return { ok: false, error: `Task ${parsed.data.id} not found` };
  return { ok: true, data: updated };
}

async function createHabit(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = createHabitArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [habit] = await db.insert(habits).values({
    userId,
    name: d.name,
    section: d.section,
    timeOfDay: d.time_of_day,
    daysOfWeek: d.days_of_week,
  }).returning();

  return { ok: true, data: { id: habit.id, name: habit.name } };
}

async function completeHabit(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = completeHabitArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

  // Verify habit belongs to user
  const [habit] = await db.select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(and(eq(habits.id, parsed.data.habit_id), eq(habits.userId, userId)))
    .limit(1);

  if (!habit) return { ok: false, error: `Habit ${parsed.data.habit_id} not found` };

  const [completion] = await db.insert(habitCompletions)
    .values({ habitId: habit.id, userId, date })
    .onConflictDoNothing()
    .returning();

  return { ok: true, data: { habit_id: habit.id, name: habit.name, date, already_done: !completion } };
}

async function setDayRule(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = setDayRuleArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [rule] = await db.insert(dayRules)
    .values({
      userId,
      dayOfWeek: d.day_of_week,
      focusArea: d.focus_area,
      maxFocusHours: d.max_focus_hours,
    })
    .onConflictDoUpdate({
      target: [dayRules.userId, dayRules.dayOfWeek],
      set: { focusArea: d.focus_area, maxFocusHours: d.max_focus_hours },
    })
    .returning();

  return { ok: true, data: rule };
}

async function createRecurring(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = createRecurringArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [recurring] = await db.insert(recurringTasks).values({
    userId,
    title: d.title,
    category: d.category,
    priority: d.priority,
    durationMinutes: d.duration_minutes,
    scheduledTime: d.scheduled_time,
    daysOfWeek: d.days_of_week,
    untilCondition: d.until_condition,
  }).returning();

  return { ok: true, data: { id: recurring.id, title: recurring.title } };
}

// ─── Export map ─────────────────────────────────────────────────────────────

export const EXECUTORS: Record<string, ExecutorFn> = {
  create_task: createTask,
  update_task: updateTask,
  delete_task: deleteTask,
  complete_task: completeTask,
  log_time: logTime,
  create_habit: createHabit,
  complete_habit: completeHabit,
  set_day_rule: setDayRule,
  create_recurring_task: createRecurring,
};
