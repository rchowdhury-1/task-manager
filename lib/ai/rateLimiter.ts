import { db } from '@/lib/db';
import { aiUsage, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { todayInTimezone } from '@/lib/utils/timezone';

const DAILY_PROMPT_LIMIT = parseInt(
  process.env.AI_PROMPTS_PER_DAY_LIMIT ?? '100',
  10,
);

export async function checkAndIncrementUsage(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const [userRow] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const today = todayInTimezone(userRow?.timezone ?? 'UTC');

  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: today, promptCount: 1, tokenCount: 0 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: {
        promptCount: sql`${aiUsage.promptCount} + 1`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return {
    allowed: row.promptCount <= DAILY_PROMPT_LIMIT,
    used: row.promptCount,
    limit: DAILY_PROMPT_LIMIT,
  };
}

export async function incrementTokenUsage(
  userId: string,
  tokens: number,
): Promise<void> {
  const [userRow] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1);
  const today = todayInTimezone(userRow?.timezone ?? 'UTC');

  await db
    .insert(aiUsage)
    .values({ userId, day: today, promptCount: 0, tokenCount: tokens })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: {
        tokenCount: sql`${aiUsage.tokenCount} + ${tokens}`,
        updatedAt: sql`now()`,
      },
    });
}
