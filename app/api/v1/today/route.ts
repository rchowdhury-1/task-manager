import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tasks,
  habits,
  habitCompletions,
  dayRules,
  recurringTasks,
} from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const dateStr = dateParam ?? new Date().toISOString().split("T")[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json({ error: "Invalid date format, use YYYY-MM-DD" }, { status: 400 });
  }

  // Use noon UTC to avoid any DST shifts when extracting day-of-week
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getDay(); // 0=Sun

  const [dayRuleRows, taskRows, recurringRows, habitRows, completionRows] =
    await Promise.all([
      db
        .select()
        .from(dayRules)
        .where(
          and(eq(dayRules.userId, userId), eq(dayRules.dayOfWeek, dayOfWeek))
        )
        .limit(1),

      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.assignedDay, dateStr))),

      db
        .select()
        .from(recurringTasks)
        .where(
          and(
            eq(recurringTasks.userId, userId),
            eq(recurringTasks.active, true),
            sql`${dayOfWeek} = ANY(${recurringTasks.daysOfWeek})`
          )
        ),

      db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), eq(habits.active, true)))
        .orderBy(habits.section, habits.name),

      db
        .select({
          habit_id: habitCompletions.habitId,
          date: habitCompletions.date,
        })
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.userId, userId),
            eq(habitCompletions.date, dateStr)
          )
        ),
    ]);

  const dayRule = dayRuleRows[0] ?? {
    focusArea: "flex",
    maxFocusHours: 8,
  };

  return Response.json({
    date: dateStr,
    dayOfWeek,
    dayRule,
    tasks: taskRows,
    recurring: recurringRows,
    habits: habitRows,
    completions: completionRows,
  });
});
