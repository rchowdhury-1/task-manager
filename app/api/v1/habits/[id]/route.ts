import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateHabitSchema } from "@/lib/validation/habits";
import { isValidUUID } from "@/lib/utils/validate";

const NOT_FOUND = Response.json({ error: "Not found" }, { status: 404 });
const BAD_ID = Response.json({ error: "Invalid habit id" }, { status: 400 });

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const body = await req.json();
  const parsed = updateHabitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const set: Record<string, unknown> = {};

  if (d.name !== undefined)         set.name = d.name;
  if (d.section !== undefined)      set.section = d.section;
  if (d.time_of_day !== undefined)  set.timeOfDay = d.time_of_day;
  if (d.days_of_week !== undefined) set.daysOfWeek = d.days_of_week;
  if (d.active !== undefined)       set.active = d.active;

  if (Object.keys(set).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(habits)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning();

  return updated ? Response.json(updated) : NOT_FOUND;
});

export const DELETE = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const deleted = await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning({ id: habits.id });

  if (deleted.length === 0) return NOT_FOUND;
  return new Response(null, { status: 204 });
});
