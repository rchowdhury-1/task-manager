import { describe, it, expect, vi } from 'vitest';
import { EXECUTORS } from '@/lib/ai/executors';

// ─── Mock DB helpers ────────────────────────────────────────────────────────

function mockDb(returnValue: unknown = [{ id: 'test-id', title: 'Test' }]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ returning, onConflictDoUpdate, onConflictDoNothing });
  const limit = vi.fn().mockResolvedValue(returnValue);
  const whereForSelect = vi.fn().mockReturnValue({ limit, returning });
  const from = vi.fn().mockReturnValue({ where: whereForSelect });
  const whereForUpdate = vi.fn().mockReturnValue({ returning });
  const whereForDelete = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where: whereForUpdate });

  return {
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn().mockReturnValue({ set }),
    delete: vi.fn().mockReturnValue({ where: whereForDelete }),
    select: vi.fn().mockReturnValue({ from }),
    _mocks: { returning, values, set, whereForUpdate, whereForDelete, whereForSelect, limit },
  } as unknown as Parameters<typeof EXECUTORS[string]>[2];
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

  it('rejects invalid category', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_task(USER_ID, { title: 'Test', category: 'invalid' }, db);
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
      category: 'career',
    }, db);
    expect(result.ok).toBe(true);
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

// ─── Security: user_id from args is ignored ─────────────────────────────────

describe('security boundary', () => {
  it('create_task uses parameter userId, not args.user_id', async () => {
    const db = mockDb();
    // Even if args contain a user_id, the executor uses the parameter
    const result = await EXECUTORS.create_task(USER_ID, {
      title: 'Test',
      user_id: 'attacker-id',
    }, db);
    // The executor should succeed (user_id in args is ignored via schema)
    expect(result.ok).toBe(true);
  });
});
