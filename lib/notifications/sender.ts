import webpush from 'web-push';
import { db } from '@/lib/db';
import { pushSubscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:placeholder@personalos.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendEngagementNotification(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const subs = await db.select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      ).catch(async (err) => {
        // 404/410 = subscription expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        }
        throw err;
      })
    )
  );

  return {
    sent: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}

export async function sendToAllEnabledUsers(
  payload: (userId: string) => { title: string; body: string; tag?: string }
) {
  const enabledUsers = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.notificationsEnabled, true));

  let totalSent = 0;
  let totalFailed = 0;

  for (const user of enabledUsers) {
    const result = await sendEngagementNotification(user.id, payload(user.id));
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { users: enabledUsers.length, sent: totalSent, failed: totalFailed };
}
