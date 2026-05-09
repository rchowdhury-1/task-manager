import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/handler";

const aiRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = aiRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  return Response.json({
    summary: `I would have processed: ${parsed.data.message}`,
    operations_executed: 0,
    warnings: [],
    tokens_used: 0,
    duration_ms: 50,
  });
});
