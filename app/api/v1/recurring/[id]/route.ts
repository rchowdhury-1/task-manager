import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringTasks } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateRecurringSchema } from "@/lib/validation/recurring";
import { isValidUUID } from "@/lib/utils/validate";

const NOT_FOUND = Response.json({ error: "Not found" }, { status: 404 });
const BAD_ID = Response.json({ error: "Invalid recurring task id" }, { status: 400 });

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const body = await req.json();
  const parsed = updateRecurringSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const set: Record<string, unknown> = {};

  if (d.title !== undefined)            set.title = d.title;
  if (d.category !== undefined)         set.category = d.category;
  if (d.priority !== undefined)         set.priority = d.priority;
  if (d.duration_minutes !== undefined) set.durationMinutes = d.duration_minutes;
  if (d.scheduled_time !== undefined)   set.scheduledTime = d.scheduled_time;
  if (d.days_of_week !== undefined)     set.daysOfWeek = d.days_of_week;
  if (d.until_condition !== undefined)  set.untilCondition = d.until_condition;

  if (Object.keys(set).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(recurringTasks)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(and(eq(recurringTasks.id, id), eq(recurringTasks.userId, userId)))
    .returning();

  return updated ? Response.json(updated) : NOT_FOUND;
});

export const DELETE = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const deleted = await db
    .delete(recurringTasks)
    .where(and(eq(recurringTasks.id, id), eq(recurringTasks.userId, userId)))
    .returning({ id: recurringTasks.id });

  if (deleted.length === 0) return NOT_FOUND;
  return new Response(null, { status: 204 });
});
