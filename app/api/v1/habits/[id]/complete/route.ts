import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { habits, habitCompletions } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { completeHabitSchema } from "@/lib/validation/habits";
import { isValidUUID } from "@/lib/utils/validate";

const BAD_ID = Response.json({ error: "Invalid habit id" }, { status: 400 });
const NOT_FOUND = Response.json({ error: "Not found" }, { status: 404 });

async function ownsHabit(userId: string, habitId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  return !!row;
}

// POST — mark a habit complete on a given date (idempotent)
export const POST = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const body = await req.json();
  const parsed = completeHabitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  if (!(await ownsHabit(userId, id))) return NOT_FOUND;

  await db
    .insert(habitCompletions)
    .values({ habitId: id, userId, date: parsed.data.date })
    .onConflictDoNothing();

  return Response.json({ completed: true, date: parsed.data.date });
});

// DELETE — remove a habit completion for a given date
export const DELETE = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return BAD_ID;

  const body = await req.json();
  const parsed = completeHabitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  if (!(await ownsHabit(userId, id))) return NOT_FOUND;

  await db
    .delete(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, id),
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.date, parsed.data.date)
      )
    );

  return Response.json({ completed: false, date: parsed.data.date });
});
