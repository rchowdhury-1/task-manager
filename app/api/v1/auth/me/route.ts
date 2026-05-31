import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateMeSchema } from "@/lib/validation/me";

const userFields = {
  id: users.id,
  email: users.email,
  name: users.name,
  timezone: users.timezone,
  notificationsEnabled: users.notificationsEnabled,
  trialEndsAt: users.trialEndsAt,
  createdAt: users.createdAt,
};

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const [user] = await db
    .select(userFields)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user });
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = updateMeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const set: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) set.name = parsed.data.name;
  if (parsed.data.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: parsed.data.timezone });
      set.timezone = parsed.data.timezone;
    } catch {
      return Response.json({ error: "Invalid timezone" }, { status: 400 });
    }
  }

  if (Object.keys(set).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(eq(users.id, userId))
    .returning(userFields);

  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ user: updated });
});
