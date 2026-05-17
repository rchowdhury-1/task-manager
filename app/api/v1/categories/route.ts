import { NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/handler";
import { createCategorySchema } from "@/lib/validation/categories";

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder));

  return Response.json(rows);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const [row] = await db
    .insert(categories)
    .values({ userId, ...parsed.data })
    .returning();

  return Response.json(row, { status: 201 });
});
