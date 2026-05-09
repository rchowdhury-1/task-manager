import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL in production; in development it is optional
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : process.env.DATABASE_URL.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
  max: 10,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
