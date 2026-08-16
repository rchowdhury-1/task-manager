import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateProjectSchema } from "@/lib/validation/projects";
import { isUniqueViolation } from "@/lib/db/errors";
import { isValidUUID } from "@/lib/utils/validate";
import { notFound, badRequest, zodErrorResponse } from "@/lib/api/responses";
import { slugify } from "@/lib/utils/slugify";

export const GET = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return badRequest("Invalid project id");

  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  return row ? Response.json(row) : notFound();
});

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return badRequest("Invalid project id");

  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { name, clientRate, ...rest } = parsed.data;
  const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  // Renaming a project re-derives its slug, same as categories do.
  if (name !== undefined) {
    set.name = name;
    set.slug = slugify(name);
  }
  // drizzle's numeric column type expects a string, not a JS number
  if (clientRate !== undefined) set.clientRate = String(clientRate);

  try {
    const [row] = await db
      .update(projects)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(set as any)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    return row ? Response.json(row) : notFound();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "You already have a project with that name" }, { status: 409 });
    }
    throw err;
  }
});

export const DELETE = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return badRequest("Invalid project id");

  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning({ id: projects.id });

  if (deleted.length === 0) return notFound();
  return new Response(null, { status: 204 });
});
