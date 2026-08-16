import { describe, it, expect, vi } from 'vitest';

// Mock the schema imports before importing the module
vi.mock('@/lib/db/schema', () => ({
  users: { id: 'id', timezone: 'timezone' },
  tasks: { userId: 'userId' },
  habits: { userId: 'userId' },
  dayRules: { userId: 'userId' },
  recurringTasks: { userId: 'userId' },
  projects: { userId: 'userId' },
}));

vi.mock('@/lib/utils/timezone', () => ({
  todayInTimezone: () => '2026-06-01',
}));

import { buildUserContext } from '@/lib/ai/context';
import { users, tasks, habits, dayRules, recurringTasks, projects } from '@/lib/db/schema';

/**
 * A single permissive query-builder chain, thenable at every step so it
 * resolves correctly regardless of which methods buildUserContext chains
 * before awaiting (from().where() for habits/dayRules/recurring,
 * from().where().orderBy().limit() for tasks, from().where().limit() for
 * users). No call-order counter — which table's rows come back is decided
 * by object identity via `dataFor`, not by "which select() call is this".
 */
function makeChain<T>(rows: T[]) {
  const chain = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
    then: (resolve: (v: T[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

function mockDb(data: { tasks?: unknown[]; habits?: unknown[]; dayRules?: unknown[]; recurring?: unknown[]; projects?: unknown[] } = {}) {
  const dataFor = new Map<object, unknown[]>([
    [users, [{ timezone: 'Europe/London' }]],
    [tasks, data.tasks ?? []],
    [habits, data.habits ?? []],
    [dayRules, data.dayRules ?? []],
    [recurringTasks, data.recurring ?? []],
    [projects, data.projects ?? []],
  ]);

  const select = vi.fn().mockImplementation(() => ({
    from: (table: object) => makeChain(dataFor.get(table) ?? []),
  }));

  return { select } as unknown as Parameters<typeof buildUserContext>[1];
}

describe('buildUserContext', () => {
  it('formats correctly with empty data', async () => {
    const db = mockDb();
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('Tasks (0):');
    expect(result).toContain('- (none)');
    expect(result).toContain('Habits (0):');
    expect(result).toContain('Recurring tasks (0)');
    expect(result).toContain('Projects (0');
  });

  it('includes today\'s date', async () => {
    const db = mockDb();
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('2026-06-01');
  });

  it('formats tasks with details', async () => {
    const db = mockDb({
      tasks: [{
        id: 'abc-123',
        title: 'Mercor prep',
        category: 'career',
        priority: 1,
        status: 'in_progress',
        assignedDay: '2026-05-09',
        scheduledTime: '10:00',
        durationMinutes: 120,
      }],
    });
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('Tasks (1):');
    expect(result).toContain('Mercor prep');
    expect(result).toContain('career');
    expect(result).toContain('P1');
  });

  it('truncates tasks at 30', async () => {
    const manyTasks = Array.from({ length: 35 }, (_, i) => ({
      id: `id-${i}`,
      title: `Task ${i}`,
      category: 'career',
      priority: 2,
      status: 'backlog',
      assignedDay: null,
      scheduledTime: null,
      durationMinutes: 60,
    }));
    const db = mockDb({ tasks: manyTasks.slice(0, 30) });
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('Tasks (30):');
  });

  it('is unaffected by the order buildUserContext issues its six queries in', async () => {
    // Regression guard for the old callCount-indexed mock: this test
    // seeds every table's data distinctly and would fail if any table's
    // rows leaked into another's formatted section, regardless of query
    // order inside buildUserContext.
    const db = mockDb({
      tasks: [{ id: 't1', title: 'Task A', category: 'career', priority: 2, status: 'backlog', assignedDay: null, scheduledTime: null, durationMinutes: 30 }],
      habits: [{ id: 'h1', name: 'Habit A', section: 'body', timeOfDay: 'morning', active: true }],
      dayRules: [{ dayOfWeek: 1, focusArea: 'deep_work', maxFocusHours: 4 }],
      recurring: [{ id: 'r1', title: 'Recurring A', category: 'career', daysOfWeek: [1, 3], scheduledTime: '09:00', durationMinutes: 45, active: true }],
      projects: [{ slug: 'glass-gardens', name: 'Glass Gardens', type: 'client', status: 'active', clientName: 'Glass Gardens Aquatics' }],
    });
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('Task A');
    expect(result).toContain('Habit A');
    expect(result).toContain('deep_work');
    expect(result).toContain('Recurring A');
    expect(result).toContain('Glass Gardens');
    expect(result).toContain('Glass Gardens Aquatics');
  });

  it('formats projects with client info when present', async () => {
    const db = mockDb({
      projects: [
        { slug: 'glass-gardens', name: 'Glass Gardens', type: 'client', status: 'active', clientName: 'Glass Gardens Aquatics' },
        { slug: 'side-project', name: 'Side project', type: 'personal', status: 'paused', clientName: null },
      ],
    });
    const result = await buildUserContext('user-1', db);
    expect(result).toContain('Projects (2');
    expect(result).toContain("glass-gardens: 'Glass Gardens' (client, active, client: Glass Gardens Aquatics)");
    expect(result).toContain("side-project: 'Side project' (personal, paused)");
  });
});
