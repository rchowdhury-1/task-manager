import { NextRequest } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectUpdates } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createProjectUpdateSchema } from "@/lib/validation/projectUpdates";
import { isValidUUID } from "@/lib/utils/validate";
import { notFound, badRequest, zodErrorResponse } from "@/lib/api/responses";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

async function ownsProject(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return !!row;
}

export const GET = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return badRequest("Invalid project id");
  if (!(await ownsProject(userId, id))) return notFound("Project not found");

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const rows = await db
    .select()
    .from(projectUpdates)
    .where(eq(projectUpdates.projectId, id))
    .orderBy(desc(projectUpdates.createdAt))
    .limit(limit);

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!isValidUUID(id)) return badRequest("Invalid project id");
  if (!(await ownsProject(userId, id))) return notFound("Project not found");

  const body = await req.json();
  const parsed = createProjectUpdateSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const [row] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(projectUpdates)
      .values({ projectId: id, userId, body: parsed.data.body })
      .returning();
    await tx
      .update(projects)
      .set({ updatedAt: sql`now()` })
      .where(eq(projects.id, id));
    return [inserted];
  });

  return Response.json(row, { status: 201 });
});
