/**
 * Verify Neon connection.
 * Run with: npx tsx scripts/verify.ts
 *
 * Requires DATABASE_URL to be set in .env.local
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set in .env.local");
    process.exit(1);
  }

  console.log("🔌  Connecting to Neon…");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query("SELECT 1 AS ok");
    if (res.rows[0]?.ok === 1) {
      console.log("✅  Neon connection successful.");
    } else {
      console.error("❌  Unexpected response:", res.rows);
    }
  } catch (err) {
    console.error("❌  Connection failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
