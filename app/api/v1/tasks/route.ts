import { NextRequest } from "next/server";
import { eq, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createTaskSchema } from "@/lib/validation/tasks";

// Status ordering: in_progress first, backlog last
const statusOrder = sql`CASE ${tasks.status}
  WHEN 'in_progress' THEN 1
  WHEN 'this_week'   THEN 2
  WHEN 'done'        THEN 3
  WHEN 'backlog'     THEN 4
  ELSE 5 END`;

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(statusOrder, asc(tasks.priority), asc(tasks.assignedDay), desc(tasks.createdAt));

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      title: d.title,
      description: d.description ?? null,
      category: d.category,
      status: d.status,
      priority: d.priority,
      assignedDay: d.assigned_day ?? null,
      scheduledTime: d.scheduled_time ?? null,
      durationMinutes: d.duration_minutes,
      lastLeftOff: d.last_left_off ?? null,
      nextSteps: d.next_steps,
      notes: d.notes ?? null,
    })
    .returning();

  return Response.json(task, { status: 201 });
});
