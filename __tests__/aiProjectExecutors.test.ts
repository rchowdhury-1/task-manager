import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { EXECUTORS } from '@/lib/ai/executors';

// Same rendering approach as aiExecutors.test.ts: capture the actual
// predicate passed to .where() and render it to real SQL + bound params,
// so tests assert on what a query would ACTUALLY filter by.
const dialect = new PgDialect();
function renderWhere(whereMock: ReturnType<typeof vi.fn>, callIndex = 0) {
  const predicate = whereMock.mock.calls[callIndex]?.[0];
  if (!predicate) throw new Error(`where() was not called (call index ${callIndex})`);
  return dialect.sqlToQuery(predicate);
}

const USER_ID = 'user-123';

/**
 * A queue-based mock: `selectQueue` holds one entry per select().from()
 * .where()[.limit()|.orderBy()] call, in the order the executor under test
 * issues them (project-resolution does up to two selects — slug lookup,
 * then name lookup — before falling through to an insert).
 */
function mockDb(opts: {
  selectQueue?: unknown[][];
  insertReturn?: unknown;
  updateReturn?: unknown[];
} = {}) {
  const selectQueue = [...(opts.selectQueue ?? [])];
  const nextSelectResult = () => Promise.resolve(selectQueue.shift() ?? []);

  const whereForSelect = vi.fn().mockReturnValue({
    limit: vi.fn().mockImplementation(nextSelectResult),
    orderBy: vi.fn().mockImplementation(nextSelectResult),
  });
  const fromForSelect = vi.fn().mockReturnValue({ where: whereForSelect });

  const insertReturning = vi.fn().mockResolvedValue([opts.insertReturn ?? { id: 'new-id', slug: 'new-project', name: 'New Project' }]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });

  const whereForUpdate = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(opts.updateReturn ?? []) });
  const updateSet = vi.fn().mockReturnValue({ where: whereForUpdate });

  const txInsertReturning = vi.fn().mockResolvedValue([opts.insertReturn ?? { id: 'update-id' }]);
  const txInsertValues = vi.fn().mockReturnValue({ returning: txInsertReturning });
  const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere });

  const tx = {
    insert: vi.fn().mockReturnValue({ values: txInsertValues }),
    update: vi.fn().mockReturnValue({ set: txUpdateSet }),
  };

  const db = {
    select: vi.fn().mockReturnValue({ from: fromForSelect }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    update: vi.fn().mockReturnValue({ set: updateSet }),
    transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx)),
  };

  return {
    ...db,
    _mocks: { whereForSelect, insertValues, insertReturning, whereForUpdate, updateSet, tx, txInsertValues, txUpdateSet },
  } as unknown as Parameters<typeof EXECUTORS[string]>[2] & { _mocks: Record<string, unknown> };
}

// ─── create_project ─────────────────────────────────────────────────────────

describe('create_project', () => {
  it('creates a personal project with default type/status', async () => {
    const db = mockDb({ insertReturn: { id: 'p1', slug: 'side-project', name: 'Side project' } });
    const result = await EXECUTORS.create_project(USER_ID, { name: 'Side project' }, db);
    expect(result.ok).toBe(true);
  });

  it('creates a client project, converting client_rate to a string for the numeric column', async () => {
    const db = mockDb({ insertReturn: { id: 'p1', slug: 'glass-gardens', name: 'Glass Gardens' } });
    await EXECUTORS.create_project(USER_ID, {
      name: 'Glass Gardens',
      type: 'client',
      client_name: 'Glass Gardens Aquatics',
      client_rate: 45,
      client_currency: 'GBP',
    }, db);

    const insertValues = (db as any)._mocks.insertValues;
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: USER_ID,
      slug: 'glass-gardens',
      clientRate: '45',
    }));
  });

  it('rejects missing name', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_project(USER_ID, {}, db);
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown type', async () => {
    const db = mockDb();
    const result = await EXECUTORS.create_project(USER_ID, { name: 'X', type: 'agency' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── log_project_update ─────────────────────────────────────────────────────

describe('log_project_update', () => {
  it('logs an update against an existing project matched by slug', async () => {
    const db = mockDb({
      selectQueue: [[{ id: 'p1', slug: 'glass-gardens', name: 'Glass Gardens' }]],
      insertReturn: { id: 'u1' },
    });
    const result = await EXECUTORS.log_project_update(USER_ID, {
      project: 'glass-gardens',
      update: 'Shipped the auth flow.',
    }, db);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as any).project).toBe('Glass Gardens');
    }
  });

  it('logs an update against an existing project matched by fuzzy name (slug lookup misses, name lookup hits)', async () => {
    const db = mockDb({
      selectQueue: [[], [{ id: 'p1', slug: 'glass-gardens', name: 'Glass Gardens' }]],
      insertReturn: { id: 'u1' },
    });
    const result = await EXECUTORS.log_project_update(USER_ID, {
      project: 'Glass Gardens',
      update: 'Shipped the auth flow.',
    }, db);

    expect(result.ok).toBe(true);
  });

  it('auto-creates a new project when neither slug nor name matches, then logs the update against it', async () => {
    const db = mockDb({
      selectQueue: [[], []], // slug miss, name miss
      insertReturn: { id: 'new-id' }, // used for BOTH the auto-create insert and the update insert (mock resolves the same value each call)
    });
    const result = await EXECUTORS.log_project_update(USER_ID, {
      project: 'A Brand New Thing',
      update: 'Kicked this off.',
    }, db);

    expect(result.ok).toBe(true);
    // The auto-create path inserts a project row scoped to the caller's userId
    expect((db as any)._mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, slug: 'a-brand-new-thing', name: 'A Brand New Thing' })
    );
  });

  it('bumps the parent project updatedAt in the same transaction as the insert', async () => {
    const db = mockDb({
      selectQueue: [[{ id: 'p1', slug: 'glass-gardens', name: 'Glass Gardens' }]],
      insertReturn: { id: 'u1' },
    });
    await EXECUTORS.log_project_update(USER_ID, { project: 'glass-gardens', update: 'x' }, db);

    expect((db as any)._mocks.tx.update).toHaveBeenCalled();
    expect((db as any)._mocks.txUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ updatedAt: expect.any(Date) }));
  });

  it('rejects an empty update body', async () => {
    const db = mockDb();
    const result = await EXECUTORS.log_project_update(USER_ID, { project: 'x', update: '' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── update_project_status ──────────────────────────────────────────────────

describe('update_project_status', () => {
  it('updates status for an existing project, scoping the query by the caller\'s userId', async () => {
    const db = mockDb({
      selectQueue: [[{ id: 'p1', slug: 'glass-gardens', name: 'Glass Gardens' }]],
      updateReturn: [{ id: 'p1', name: 'Glass Gardens', status: 'paused' }],
    });
    const result = await EXECUTORS.update_project_status(USER_ID, {
      project: 'glass-gardens',
      status: 'paused',
    }, db);

    expect(result.ok).toBe(true);
    const { sql, params } = renderWhere((db as any)._mocks.whereForUpdate);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
  });

  it('does NOT auto-create — errors when no project matches', async () => {
    const db = mockDb({ selectQueue: [[], []] }); // slug miss, name miss
    const result = await EXECUTORS.update_project_status(USER_ID, {
      project: 'nonexistent',
      status: 'done',
    }, db);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('No project matching');
  });

  it('rejects an unknown status value', async () => {
    const db = mockDb();
    const result = await EXECUTORS.update_project_status(USER_ID, { project: 'x', status: 'cancelled' }, db);
    expect(result.ok).toBe(false);
  });
});

// ─── list_projects ───────────────────────────────────────────────────────────

describe('list_projects', () => {
  it('returns the caller\'s projects, scoped by userId', async () => {
    const db = mockDb({
      selectQueue: [[
        { slug: 'glass-gardens', name: 'Glass Gardens', status: 'active', type: 'client' },
        { slug: 'side-project', name: 'Side project', status: 'paused', type: 'personal' },
      ]],
    });
    const result = await EXECUTORS.list_projects(USER_ID, {}, db);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);

    const { sql, params } = renderWhere((db as any)._mocks.whereForSelect);
    expect(sql).toMatch(/user_id/);
    expect(params).toContain(USER_ID);
  });
});
