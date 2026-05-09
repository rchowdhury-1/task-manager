import { NextRequest } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { habitCompletions } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { isValidDate } from "@/lib/utils/validate";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (!isValidDate(from) || !isValidDate(to)) {
    return Response.json(
      { error: "Query params from and to are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      habit_id: habitCompletions.habitId,
      date: habitCompletions.date,
    })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.date, from),
        lte(habitCompletions.date, to)
      )
    );

  return Response.json(rows);
});
