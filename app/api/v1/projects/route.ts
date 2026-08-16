import { NextRequest } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createProjectSchema } from "@/lib/validation/projects";
import { isUniqueViolation } from "@/lib/db/errors";
import { zodErrorResponse } from "@/lib/api/responses";
import { slugify } from "@/lib/utils/slugify";

// Status ordering: active/paused (still relevant) before done/archived —
// plain alphabetical sort would put 'archived' second, which is wrong.
const statusOrder = sql`CASE ${projects.status}
  WHEN 'active'   THEN 1
  WHEN 'paused'   THEN 2
  WHEN 'done'     THEN 3
  WHEN 'archived' THEN 4
  ELSE 5 END`;

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(statusOrder, desc(projects.updatedAt));

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const d = parsed.data;
  const slug = slugify(d.name);

  try {
    const [row] = await db
      .insert(projects)
      .values({
        userId,
        slug,
        name: d.name,
        type: d.type,
        status: d.status,
        clientName: d.client_name ?? null,
        // drizzle's numeric column type expects a string, not a JS number
        clientRate: d.client_rate !== undefined ? String(d.client_rate) : null,
        clientCurrency: d.client_currency ?? null,
        notes: d.notes ?? null,
      })
      .returning();
    return Response.json(row, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "You already have a project with that name" }, { status: 409 });
    }
    throw err;
  }
});
