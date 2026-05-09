import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringTasks } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createRecurringSchema } from "@/lib/validation/recurring";

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const rows = await db
    .select()
    .from(recurringTasks)
    .where(and(eq(recurringTasks.userId, userId), eq(recurringTasks.active, true)));

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = createRecurringSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const [recurring] = await db
    .insert(recurringTasks)
    .values({
      userId,
      title: d.title,
      category: d.category,
      priority: d.priority,
      durationMinutes: d.duration_minutes,
      scheduledTime: d.scheduled_time ?? null,
      daysOfWeek: d.days_of_week,
      untilCondition: d.until_condition ?? null,
    })
    .returning();

  return Response.json(recurring, { status: 201 });
});
