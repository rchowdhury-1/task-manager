import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/handler';

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = unsubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.endpoint, parsed.data.endpoint),
    ));

  return Response.json({ ok: true });
});
