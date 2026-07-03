import { eq, and, asc } from 'drizzle-orm';
import { categories } from '@/lib/db/schema';
import type { DB } from '@/lib/db';

// Server-side helpers for validating task categories against the user's own
// topics. Tasks store the slug, so any write that sets a category must prove
// the slug belongs to the requesting user.

export async function userHasCategory(db: DB, userId: string, slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.slug, slug)))
    .limit(1);
  return !!row;
}

export async function getUserCategorySlugs(db: DB, userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  return rows.map(r => r.slug);
}

export async function getUserCategories(db: DB, userId: string) {
  return db
    .select({ slug: categories.slug, label: categories.label })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
}
