import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateTaskSchema } from "@/lib/validation/tasks";
import { isValidUUID } from "@/lib/utils/validate";

const NOT_FOUND = Response.json({ error: "Not found" }, { status: 404 });
const BAD_ID = Response.json({ error: "Invalid task id" }, { status: 400 });

export const GET = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);

  return task ? Response.json(task) : NOT_FOUND;
});

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (d.title !== undefined)            set.title = d.title;
  if (d.description !== undefined)      set.description = d.description;
  if (d.category !== undefined)         set.category = d.category;
  if (d.status !== undefined)           set.status = d.status;
  if (d.priority !== undefined)         set.priority = d.priority;
  if (d.assigned_day !== undefined)     set.assignedDay = d.assigned_day;
  if (d.scheduled_time !== undefined)   set.scheduledTime = d.scheduled_time;
  if (d.duration_minutes !== undefined)    set.durationMinutes = d.duration_minutes;
  if (d.time_logged_minutes !== undefined) set.timeLoggedMinutes = d.time_logged_minutes;
  if (d.last_left_off !== undefined)       set.lastLeftOff = d.last_left_off;
  if (d.next_steps !== undefined)       set.nextSteps = d.next_steps;
  if (d.notes !== undefined)            set.notes = d.notes;

  const [updated] = await db
    .update(tasks)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  return updated ? Response.json(updated) : NOT_FOUND;
});

export const DELETE = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });

  if (deleted.length === 0) return NOT_FOUND;
  return new Response(null, { status: 204 });
});
