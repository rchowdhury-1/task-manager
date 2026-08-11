/**
 * Standalone migration runner.
 * Run with: npx tsx lib/db/migrate.ts
 *
 * Reads DATABASE_URL from .env.local (via dotenv) and applies all
 * pending Drizzle migrations in lib/db/migrations/.
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolveSsl } from "./ssl";

// Arbitrary fixed key for the migration advisory lock. Any int8 works as
// long as it's unique to this purpose; picked once, never reused elsewhere.
const MIGRATION_LOCK_KEY = 823_642;

async function main() {
  // Neon recommends the direct (unpooled) endpoint for DDL — PgBouncer's
  // transaction-pooling mode doesn't support all session-level operations
  // migrations may need. Falls back to DATABASE_URL when no unpooled URL
  // is configured (e.g. local dev, or a plain non-pooled Postgres).
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌  DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌  Connecting to database…");

  const pool = new Pool({
    connectionString,
    ssl: resolveSsl(connectionString),
  });

  // Serialize concurrent migration runs (e.g. two Vercel builds racing) —
  // drizzle's migrator takes no lock of its own, so two simultaneous
  // `db:migrate` invocations can otherwise race on the same DDL.
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);

    const db = drizzle(client);
    const migrationsFolder = path.join(process.cwd(), "lib/db/migrations");
    console.log(`📂  Migrations folder: ${migrationsFolder}`);
    console.log("🚀  Running migrations…");

    await migrate(db, { migrationsFolder });

    console.log("✅  Migrations complete.");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
