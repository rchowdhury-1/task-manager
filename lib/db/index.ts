import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { resolveSsl } from "./ssl";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Serverless note: each warm lambda instance holds its own Pool. Keep `max`
// modest — point DATABASE_URL at Neon's pooled (PgBouncer) endpoint in
// production so N concurrent instances don't multiply into a connection
// exhaustion event on the underlying Postgres.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(process.env.DATABASE_URL),
  max: Number(process.env.PG_POOL_MAX ?? 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
