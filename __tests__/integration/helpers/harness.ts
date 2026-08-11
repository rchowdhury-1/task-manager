import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as schema from '@/lib/db/schema';
import type { DB } from '@/lib/db';

let pool: Pool | null = null;

export function getTestDb(): { db: DB; pool: Pool } {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set — copy .env.test.example to .env.test');
    pool = new Pool({ connectionString: url });
  }
  return { db: drizzle(pool, { schema }) as unknown as DB, pool };
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Deletes all rows from every domain table. Cascades handle child tables. */
export async function truncateAll(db: DB): Promise<void> {
  await db.delete(schema.users);
}

export async function createUser(
  db: DB,
  overrides: { email?: string; timezone?: string } = {}
): Promise<{ userId: string; email: string }> {
  const email = overrides.email ?? `test-${randomUUID()}@example.test`;
  const passwordHash = await bcrypt.hash('test-password-not-real', 4); // low cost, tests only
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      timezone: overrides.timezone ?? 'UTC',
    })
    .returning({ id: schema.users.id });
  return { userId: user.id, email };
}
