import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { updateCategorySchema } from "@/lib/validation/categories";

export const PATCH = withAuth(async (req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const [row] = await db
    .update(categories)
    .set(parsed.data)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!row) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  return Response.json(row);
});

export const DELETE = withAuth(async (_req: NextRequest, { userId, params }) => {
  const id = params?.id;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Prevent deleting system categories
  const [existing] = await db
    .select({ isSystem: categories.isSystem })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }
  if (existing.isSystem) {
    return Response.json({ error: "Cannot delete system categories" }, { status: 403 });
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  return new Response(null, { status: 204 });
});
