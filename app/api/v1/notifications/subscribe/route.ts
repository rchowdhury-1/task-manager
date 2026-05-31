import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/handler';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get('user-agent') ?? null;

  // Upsert: if endpoint already exists, update userId
  await db.insert(pushSubscriptions)
    .values({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    });

  return Response.json({ ok: true });
});
