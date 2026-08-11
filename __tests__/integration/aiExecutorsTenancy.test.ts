import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { EXECUTORS } from '@/lib/ai/executors';
import { tasks, habits, categories } from '@/lib/db/schema';
import { getTestDb, closeTestDb, truncateAll, createUser } from './helpers/harness';

/**
 * Real-Postgres tenancy suite. Unlike __tests__/aiExecutors.test.ts (mocked
 * DB, asserts on the rendered query), this seeds ACTUAL rows for two real
 * users against a real database and proves user B genuinely cannot read,
 * modify, or delete user A's data through the AI executors — no mock can
 * silently agree to return the wrong thing.
 *
 * Scope note: this covers the highest-risk row-targeting executors
 * (update_task, delete_task, complete_task) plus one insert-path check.
 * The hardening plan's full E1b scope is all 10 executors + representative
 * REST routes — this is a working down payment on that, not the complete
 * suite; extending it to the remaining executors/routes is mechanical
 * repetition of the same pattern established here.
 */

const { db } = getTestDb();

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await truncateAll(db);
});

async function seedCategoryAndTask(userId: string, title: string) {
  await db.insert(categories).values({
    userId,
    slug: 'work',
    label: 'Work',
    colour: 'blue',
    icon: '',
    isSystem: false,
    sortOrder: 0,
  });
  const [task] = await db
    .insert(tasks)
    .values({ userId, title, category: 'work', status: 'backlog', priority: 2 })
    .returning();
  return task;
}

describe('AI executor tenancy — real Postgres, two real users', () => {
  it('update_task: user B cannot update user A\'s task via its real id', async () => {
    const userA = await createUser(db);
    const userB = await createUser(db);
    const taskA = await seedCategoryAndTask(userA.userId, 'User A\'s task');

    const result = await EXECUTORS.update_task(
      userB.userId,
      { id: taskA.id, title: 'Hijacked by B' },
      db
    );

    expect(result.ok).toBe(false);

    const [stillA] = await db.select().from(tasks).where(eq(tasks.id, taskA.id));
    expect(stillA.title).toBe('User A\'s task');
    expect(stillA.userId).toBe(userA.userId);
  });

  it('delete_task: user B cannot delete user A\'s task via its real id', async () => {
    const userA = await createUser(db);
    const userB = await createUser(db);
    const taskA = await seedCategoryAndTask(userA.userId, 'User A\'s task');

    const result = await EXECUTORS.delete_task(userB.userId, { id: taskA.id }, db);

    expect(result.ok).toBe(false);

    const [stillThere] = await db.select().from(tasks).where(eq(tasks.id, taskA.id));
    expect(stillThere).toBeDefined();
    expect(stillThere.userId).toBe(userA.userId);
  });

  it('complete_task: user B cannot mark user A\'s task done via its real id', async () => {
    const userA = await createUser(db);
    const userB = await createUser(db);
    const taskA = await seedCategoryAndTask(userA.userId, 'User A\'s task');

    const result = await EXECUTORS.complete_task(userB.userId, { id: taskA.id }, db);

    expect(result.ok).toBe(false);

    const [stillBacklog] = await db.select().from(tasks).where(eq(tasks.id, taskA.id));
    expect(stillBacklog.status).toBe('backlog');
  });

  it('update_task: the owning user CAN update their own task (positive control)', async () => {
    const userA = await createUser(db);
    const taskA = await seedCategoryAndTask(userA.userId, 'Original title');

    const result = await EXECUTORS.update_task(
      userA.userId,
      { id: taskA.id, title: 'Updated by owner' },
      db
    );

    expect(result.ok).toBe(true);
    const [updated] = await db.select().from(tasks).where(eq(tasks.id, taskA.id));
    expect(updated.title).toBe('Updated by owner');
  });

  it('create_task: the inserted row is owned by the calling user, never a spoofed one', async () => {
    const userA = await createUser(db);
    await db.insert(categories).values({
      userId: userA.userId,
      slug: 'work',
      label: 'Work',
      colour: 'blue',
      icon: '',
      isSystem: false,
      sortOrder: 0,
    });

    const result = await EXECUTORS.create_task(
      userA.userId,
      { title: 'New task', category: 'work', user_id: 'attacker-id' } as Record<string, unknown>,
      db
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    const [row] = await db.select().from(tasks).where(eq(tasks.id, (result.data as { id: string }).id));
    expect(row.userId).toBe(userA.userId);
    expect(row.userId).not.toBe('attacker-id');
  });

  it('complete_habit: user B cannot mark user A\'s habit complete via its real id', async () => {
    const userA = await createUser(db);
    const userB = await createUser(db);
    const [habitA] = await db
      .insert(habits)
      .values({ userId: userA.userId, name: 'Morning run', section: 'body', daysOfWeek: [1, 2, 3, 4, 5] })
      .returning();

    const result = await EXECUTORS.complete_habit(
      userB.userId,
      { habit_id: habitA.id, date: '2026-08-11' },
      db
    );

    expect(result.ok).toBe(false);
  });
});
