import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { EXECUTORS } from '@/lib/ai/executors';

// Renders a captured Drizzle where-predicate to real SQL + bound params, so
// tests can assert on what a query would ACTUALLY filter by — not just that
// the executor returned ok:true, which proves nothing about tenancy.
const dialect = new PgDialect();
function renderWhere(whereMock: ReturnType<typeof vi.fn>, callIndex = 0) {
  const predicate = whereMock.mock.calls[callIndex]?.[0];
  if (!predicate) throw new Error(`where() was not called (call index ${callIndex})`);
  return dialect.sqlToQuery(predicate);
}

// ─── Mock DB helpers ────────────────────────────────────────────────────────

function mockDb(
  returnValue: unknown = [{ id: 'test-id', title: 'Test' }],
  // Rows returned by the categories lookup (select…orderBy) used for
  // resolving/validating task categories against the user's own topics.
  categoryRows: { slug: string }[] = [{ slug: 'learning' }, { slug: 'fitness' }],
) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ returning, onConflictDoUpdate, onConflictDoNothing });
  const limit = vi.fn().mockResolvedValue(returnValue);
  const orderBy = vi.fn().mockResolvedValue(categoryRows);
  const whereForSelect = vi.fn().mockReturnValue({ limit, returning, orderBy });
  const from = vi.fn().mockReturnValue({ where: whereForSelect });
  const whereForUpdate = vi.fn().mockReturnValue({ returning });
  const whereForDelete = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where: whereForUpdate });

  return {
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn().mockReturnValue({ set }),
    delete: vi.fn().mockReturnValue({ where: whereForDelete }),
    select: vi.fn().mockReturnValue({ from }),
    _mocks: { returning, values, set, whereForUpdate, whereForDelete, whereForSelect, limit, orderBy },
  } as unknown as Parameters<typeof EXECUTORS[string]>[2] & {
    _mocks: Record<string, ReturnType<typeof vi.fn>>;
  };
}

const USER_ID = 'user-123';

// ─── create_task ────────────────────────────────────────────────────────────

describe('create_task', () => {
  it('creates a task with valid args', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Buy groceries' }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects missing title', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, {}, db);
    expect(result.ok).toBe(false);
  });

  it('rejects a category the user does not own', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test', category: 'career' }, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Unknown topic');
  });

  it('rejects a malformed category slug', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test', category: 'Not A Slug!' }, db);
    expect(result.ok).toBe(false);
  });

  it('accepts a category the user owns', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test', category: 'fitness' }, db);
    expect(result.ok).toBe(true);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ category: 'fitness' }));
  });

  it('defaults to the first topic when no category given', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test' }, db);
    expect(result.ok).toBe(true);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ category: 'learning' }));
  });

  it('errors when the user has no topics at all', async () => {
    const db = mockDb(undefined, []);
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── update_task ────────────────────────────────────────────────────────────

describe('update_task', () => {
  it('updates with valid id and fields', async () => {
    const db = mockDb([{ id: 'abc-123', title: 'Updated' }]);
    const result = await EXECUTORS.update_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated title',
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid UUID', async () => {
    const db = mockDb();
    const result = await EXECUTORS.update_task(USER_ID, { id: 'not-uuid', title: 'x' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── delete_task ────────────────────────────────────────────────────────────

describe('delete_task', () => {
  it('deletes with valid id', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Gone' }]);
    const result = await EXECUTORS.delete_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }, db);
    expect(result.ok).toBe(true);
  });
});

// ─── complete_task ──────────────────────────────────────────────────────────

describe('complete_task', () => {
  it('completes with valid id', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Done task' }]);
    const result = await EXECUTORS.complete_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }, db);
    expect(result.ok).toBe(true);
  });
});

// ─── log_time ───────────────────────────────────────────────────────────────

describe('log_time', () => {
  it('logs time with valid args', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Task', timeLoggedMinutes: 90 }]);
    const result = await EXECUTORS.log_time(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      minutes: 30,
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects zero minutes', async () => {
    const db = mockDb();
    const result = await EXECUTORS.log_time(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      minutes: 0,
    }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── create_habit ───────────────────────────────────────────────────────────

describe('create_habit', () => {
  it('creates habit with valid args', async () => {
    const db = mockDb([{ id: 'hab-1', name: 'Fajr' }]);
    const result = await EXECUTORS.create_habit(USER_ID, {
      name: 'Fajr',
      section: 'faith',
      time_of_day: 'morning',
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects missing name', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_habit(USER_ID, { section: 'faith' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── set_day_rule ───────────────────────────────────────────────────────────

describe('set_day_rule', () => {
  it('sets day rule with valid args', async () => {
    const db = mockDb([{ dayOfWeek: 1, focusArea: 'job_hunt', maxFocusHours: 8 }]);
    const result = await EXECUTORS.set_day_rule(USER_ID, {
      day_of_week: 1,
      focus_area: 'job_hunt',
      max_focus_hours: 8,
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid day_of_week', async () => {
    const db = mockDb();
    const result = await EXECUTORS.set_day_rule(USER_ID, {
      day_of_week: 9,
      focus_area: 'job_hunt',
    }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── create_recurring_task ──────────────────────────────────────────────────

describe('create_recurring_task', () => {
  it('creates recurring with valid args', async () => {
    const db = mockDb([{ id: 'rec-1', title: 'Daily standup' }]);
    const result = await EXECUTORS.create_recurring_task(USER_ID, {
      title: 'Daily standup',
      days_of_week: [1, 2, 3, 4, 5],
      category: 'learning',
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects a category the user does not own', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_recurring_task(USER_ID, {
      title: 'Daily standup',
      days_of_week: [1, 2, 3],
      category: 'uber',
    }, db);
    expect(result.ok).toBe(false);
  });

  it('rejects missing days_of_week', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_recurring_task(USER_ID, {
      title: 'Test',
    }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── delete_recurring ───────────────────────────────────────────────────────

describe('delete_recurring', () => {
  it('deletes with valid id', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Uber Eats' }]);
    const result = await EXECUTORS.delete_recurring(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }, db);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid UUID', async () => {
    const db = mockDb();
    const result = await EXECUTORS.delete_recurring(USER_ID, { id: 'bad' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── Security: tenancy is enforced by the actual query predicate ───────────
//
// The old version of this suite only proved that Zod strips an unknown
// `user_id` key from args — it never inspected what the resulting query
// would actually filter by, so a regression that dropped the
// eq(table.userId, userId) predicate entirely would have sailed through
// green. These tests render the captured where-clause to real SQL + bound
// params via drizzle's PgDialect and assert the caller's userId is the one
// actually bound — and that a spoofed attacker id never reaches the query.

const ATTACKER_ID = 'attacker-id';

describe('security boundary — row-targeting executors scope by the caller\'s userId', () => {
  it('update_task filters by (id, callerUserId), ignoring any user_id in args', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Updated' }]);
    await EXECUTORS.update_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated',
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForUpdate);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });

  it('delete_task filters by (id, callerUserId)', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Gone' }]);
    await EXECUTORS.delete_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForDelete);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });

  it('complete_task filters by (id, callerUserId)', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Done' }]);
    await EXECUTORS.complete_task(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForUpdate);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });

  it('log_time filters by (id, callerUserId)', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Task', timeLoggedMinutes: 30 }]);
    await EXECUTORS.log_time(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      minutes: 30,
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForUpdate);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });

  it('delete_recurring filters by (id, callerUserId)', async () => {
    const db = mockDb([{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Uber Eats' }]);
    await EXECUTORS.delete_recurring(USER_ID, {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForDelete);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });

  it('complete_habit\'s ownership check filters by (id, callerUserId)', async () => {
    const db = mockDb([{ id: 'hab-1', name: 'Fajr' }]);
    // Explicit date skips the users-timezone lookup, so whereForSelect's
    // first (only) call is the habit-ownership check we're asserting on.
    await EXECUTORS.complete_habit(USER_ID, {
      habit_id: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-08-11',
      user_id: ATTACKER_ID,
    }, db);

    const { sql, params } = renderWhere(db._mocks.whereForSelect);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
    expect(params).not.toContain(ATTACKER_ID);
  });
});

describe('security boundary — insert executors tag rows with the caller\'s userId', () => {
  it('create_task inserts with the caller\'s userId, not args.user_id', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, {
      title: 'Test',
      user_id: ATTACKER_ID,
    }, db);
    expect(result.ok).toBe(true);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
    expect(db._mocks.values).not.toHaveBeenCalledWith(expect.objectContaining({ userId: ATTACKER_ID }));
  });

  it('create_habit inserts with the caller\'s userId, not args.user_id', async () => {
    const db = mockDb([{ id: 'hab-1', name: 'Fajr' }]);
    await EXECUTORS.create_habit(USER_ID, {
      name: 'Fajr',
      user_id: ATTACKER_ID,
    }, db);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
    expect(db._mocks.values).not.toHaveBeenCalledWith(expect.objectContaining({ userId: ATTACKER_ID }));
  });

  it('set_day_rule inserts with the caller\'s userId, not args.user_id', async () => {
    const db = mockDb([{ dayOfWeek: 1, focusArea: 'job_hunt', maxFocusHours: 8 }]);
    await EXECUTORS.set_day_rule(USER_ID, {
      day_of_week: 1,
      focus_area: 'job_hunt',
      user_id: ATTACKER_ID,
    }, db);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
    expect(db._mocks.values).not.toHaveBeenCalledWith(expect.objectContaining({ userId: ATTACKER_ID }));
  });

  it('create_recurring_task inserts with the caller\'s userId, not args.user_id', async () => {
    const db = mockDb([{ id: 'rec-1', title: 'Daily standup' }]);
    await EXECUTORS.create_recurring_task(USER_ID, {
      title: 'Daily standup',
      days_of_week: [1, 2, 3],
      category: 'learning',
      user_id: ATTACKER_ID,
    }, db);
    expect(db._mocks.values).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
    expect(db._mocks.values).not.toHaveBeenCalledWith(expect.objectContaining({ userId: ATTACKER_ID }));
  });
});
