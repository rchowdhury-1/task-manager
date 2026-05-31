import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/handler';

const preferencesSchema = z.object({
  notificationsEnabled: z.boolean(),
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const [updated] = await db.update(users)
    .set({ notificationsEnabled: parsed.data.notificationsEnabled })
    .where(eq(users.id, userId))
    .returning({ notificationsEnabled: users.notificationsEnabled });

  return Response.json({ notificationsEnabled: updated.notificationsEnabled });
});
