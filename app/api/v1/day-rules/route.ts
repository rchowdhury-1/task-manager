import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dayRules } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";

const DEFAULT_RULE = (userId: string, dayOfWeek: number) => ({
  id: null,
  userId,
  dayOfWeek,
  focusArea: "flex",
  maxFocusHours: 8,
});

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const existing = await db
    .select()
    .from(dayRules)
    .where(eq(dayRules.userId, userId));

  const ruleMap = new Map(existing.map((r) => [r.dayOfWeek, r]));

  // Always return all 7 days (0=Sun … 6=Sat), filling gaps with defaults
  const result = Array.from({ length: 7 }, (_, dow) =>
    ruleMap.get(dow) ?? DEFAULT_RULE(userId, dow)
  );

  return Response.json(result);
});
