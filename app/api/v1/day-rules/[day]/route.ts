import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dayRules } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { upsertDayRuleSchema } from "@/lib/validation/day-rules";

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const dayParam = params?.day;
  const day = parseInt(dayParam ?? "", 10);
  if (isNaN(day) || day < 0 || day > 6) {
    return Response.json({ error: "Day must be an integer 0-6" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = upsertDayRuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { focus_area, max_focus_hours } = parsed.data;

  const [rule] = await db
    .insert(dayRules)
    .values({
      userId,
      dayOfWeek: day,
      focusArea: focus_area,
      maxFocusHours: max_focus_hours,
    })
    .onConflictDoUpdate({
      target: [dayRules.userId, dayRules.dayOfWeek],
      set: { focusArea: focus_area, maxFocusHours: max_focus_hours },
    })
    .returning();

  return Response.json(rule);
});

export const GET = withAuth(async (_req: NextRequest, { userId, params }) => {
  const dayParam = params?.day;
  const day = parseInt(dayParam ?? "", 10);
  if (isNaN(day) || day < 0 || day > 6) {
    return Response.json({ error: "Day must be an integer 0-6" }, { status: 400 });
  }

  const [rule] = await db
    .select()
    .from(dayRules)
    .where(and(eq(dayRules.userId, userId), eq(dayRules.dayOfWeek, day)))
    .limit(1);

  return rule
    ? Response.json(rule)
    : Response.json(
        { id: null, userId, dayOfWeek: day, focusArea: "flex", maxFocusHours: 8 }
      );
});
