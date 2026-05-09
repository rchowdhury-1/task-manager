import { NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createHabitSchema } from "@/lib/validation/habits";

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.section), asc(habits.name));

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const [habit] = await db
    .insert(habits)
    .values({
      userId,
      name: d.name,
      section: d.section,
      timeOfDay: d.time_of_day ?? null,
      daysOfWeek: d.days_of_week,
      active: d.active,
    })
    .returning();

  return Response.json(habit, { status: 201 });
});
