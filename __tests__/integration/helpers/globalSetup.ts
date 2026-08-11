import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // fallback for local runs

export async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Integration tests need a disposable test ' +
      'database — see .env.test.example. Refusing to run.'
    );
  }
  // Hard safety check: never let this suite run against anything that
  // looks like a hosted/production database. Only plain local Postgres.
  if (url.includes('neon.tech') || url.includes('.rds.') || url.includes('supabase')) {
    throw new Error(
      `DATABASE_URL looks like a hosted database (${url.replace(/:[^:@]+@/, ':***@')}). ` +
      'Integration tests truncate tables between runs — refusing to run against ' +
      'anything that isn\'t a local, disposable Postgres instance.'
    );
  }
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(
      'DATABASE_URL does not point at localhost. Integration tests must run ' +
      'against a local, disposable Postgres instance.'
    );
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') });
  await pool.end();
}
