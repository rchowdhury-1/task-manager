import { NextRequest } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks, habits, habitCompletions } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { activityLevel } from "@/lib/utils/activityLevel";

const rangeSchema = z.enum(["7d", "30d", "90d"]).default("30d");

function daysFromRange(range: string): number {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

function dateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subtractDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function allDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(dateISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  const url = new URL(req.url);
  const rangeParsed = rangeSchema.safeParse(url.searchParams.get("range") ?? undefined);
  const range = rangeParsed.success ? rangeParsed.data : "30d";
  const days = daysFromRange(range);

  const now = new Date();
  const today = dateISO(now);
  const startDate = subtractDays(now, days);
  const startISO = dateISO(startDate);

  // ─── Tasks completed in range ───────────────────────────────────────
  const completedTasks = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(sum(${tasks.timeLoggedMinutes}), 0)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "done"),
        gte(tasks.updatedAt, startDate),
      ),
    );

  const tasksCompleted = completedTasks[0]?.count ?? 0;
  const hoursFocused = Math.round(((completedTasks[0]?.totalMinutes ?? 0) / 60) * 10) / 10;

  // ─── Hours by category ──────────────────────────────────────────────
  const hoursByCat = await db
    .select({
      category: tasks.category,
      totalMinutes: sql<number>`coalesce(sum(${tasks.timeLoggedMinutes}), 0)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        gte(tasks.updatedAt, startDate),
      ),
    )
    .groupBy(tasks.category);

  const hours_by_category = hoursByCat.map((r) => ({
    category: r.category,
    hours: Math.round((r.totalMinutes / 60) * 10) / 10,
  }));

  // ─── Habit completions in range ─────────────────────────────────────
  const habitCompletionsInRange = await db
    .select({
      date: habitCompletions.date,
      habitId: habitCompletions.habitId,
    })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.date, startISO),
      ),
    );

  // ─── Active habits ──────────────────────────────────────────────────
  const activeHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      section: habits.section,
    })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.active, true)));

  // Habit completion rate
  const totalPossible = activeHabits.length * days;
  const habitCompletionRate =
    totalPossible > 0
      ? Math.round((habitCompletionsInRange.length / totalPossible) * 100)
      : 0;

  // ─── Daily completions (task + habit) ───────────────────────────────
  // Count tasks completed per day (by updated_at date)
  const tasksByDay = await db
    .select({
      day: sql<string>`date(${tasks.updatedAt})`,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "done"),
        gte(tasks.updatedAt, startDate),
      ),
    )
    .groupBy(sql`date(${tasks.updatedAt})`);

  const taskDayMap = new Map(tasksByDay.map((r) => [r.day, r.count]));

  // Habit completions by day
  const habitDayMap = new Map<string, number>();
  for (const c of habitCompletionsInRange) {
    habitDayMap.set(c.date, (habitDayMap.get(c.date) ?? 0) + 1);
  }

  const allDates = allDatesInRange(startDate, now);
  const daily_completions = allDates.map((d) => ({
    date: d,
    count: (taskDayMap.get(d) ?? 0) + (habitDayMap.get(d) ?? 0),
  }));

  // ─── Habit consistency ──────────────────────────────────────────────
  const completionsByHabit = new Map<string, number>();
  for (const c of habitCompletionsInRange) {
    completionsByHabit.set(c.habitId, (completionsByHabit.get(c.habitId) ?? 0) + 1);
  }

  const habit_consistency = activeHabits.map((h) => {
    const completed = completionsByHabit.get(h.id) ?? 0;
    return {
      habit_id: h.id,
      name: h.name,
      section: h.section,
      total_days: days,
      completed_days: completed,
      percentage: days > 0 ? Math.round((completed / days) * 100) : 0,
    };
  });

  // ─── Current streak ────────────────────────────────────────────────
  // Longest current streak: consecutive days ending at today with at least 1 completion
  let currentStreak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = dateISO(subtractDays(now, i));
    const dayCount = (taskDayMap.get(d) ?? 0) + (habitDayMap.get(d) ?? 0);
    if (dayCount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // ─── Activity heatmap (last 365 days) ───────────────────────────────
  // Get all habit completions for the last year
  const yearStart = subtractDays(now, 364);
  const yearStartISO = dateISO(yearStart);

  const yearHabitCompletions = await db
    .select({
      date: habitCompletions.date,
      count: sql<number>`count(*)::int`,
    })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.date, yearStartISO),
      ),
    )
    .groupBy(habitCompletions.date);

  const yearTaskCompletions = await db
    .select({
      day: sql<string>`date(${tasks.updatedAt})`,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "done"),
        gte(tasks.updatedAt, yearStart),
      ),
    )
    .groupBy(sql`date(${tasks.updatedAt})`);

  const yearHabitMap = new Map(yearHabitCompletions.map((r) => [r.date, r.count]));
  const yearTaskMap = new Map(yearTaskCompletions.map((r) => [r.day, r.count]));

  const yearDates = allDatesInRange(yearStart, now);
  const activity_heatmap = yearDates.map((d) => {
    const total = (yearHabitMap.get(d) ?? 0) + (yearTaskMap.get(d) ?? 0);
    return { date: d, activity: activityLevel(total) };
  });

  return Response.json({
    range,
    summary: {
      tasks_completed: tasksCompleted,
      hours_focused: hoursFocused,
      habit_completion_rate: habitCompletionRate,
      current_streak: currentStreak,
    },
    hours_by_category,
    daily_completions,
    habit_consistency,
    activity_heatmap,
  });
});
