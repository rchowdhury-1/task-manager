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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌  Connecting to database…");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);

  const migrationsFolder = path.join(process.cwd(), "lib/db/migrations");
  console.log(`📂  Migrations folder: ${migrationsFolder}`);
  console.log("🚀  Running migrations…");

  await migrate(db, { migrationsFolder });

  console.log("✅  Migrations complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
