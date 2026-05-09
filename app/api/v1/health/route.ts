import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("[GET /api/v1/health]", err);
    return Response.json(
      { status: "error", db: "disconnected" },
      { status: 503 }
    );
  }
}
