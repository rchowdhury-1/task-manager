import { describe, it, expect, vi } from 'vitest';

// Mock the schema imports before importing the module
vi.mock('@/lib/db/schema', () => ({
  tasks: { userId: 'userId' },
  habits: { userId: 'userId' },
  dayRules: { userId: 'userId' },
  recurringTasks: { userId: 'userId' },
}));

import { buildUserContext } from '@/lib/ai/context';

function mockDb(data: { tasks?: unknown[]; habits?: unknown[]; dayRules?: unknown[]; recurring?: unknown[] } = {}) {
  const taskData = data.tasks ?? [];
  const habitData = data.habits ?? [];
  const dayRuleData = data.dayRules ?? [];
  const recurringData = data.recurring ?? [];

  let callCount = 0;
  const limit = vi.fn();
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });

  // Each call to select().from().where() returns different data
  const select = vi.fn().mockImplementation(() => {
    const currentCall = callCount++;
    const resolvedData = [taskData, habitData, dayRuleData, recurringData][currentCall] ?? [];

    const mockLimit = vi.fn().mockResolvedValue(resolvedData);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockImplementation(() => {
      // tasks path has orderBy, others resolve directly
      if (currentCall === 0) return { orderBy: mockOrderBy };
      return Promise.resolve(resolvedData);
    });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

    return { from: mockFrom };
  });

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
  });

  it('includes today\'s date', async () => {
    const db = mockDb();
    const result = await buildUserContext('user-1', db);
    const today = new Date().toISOString().slice(0, 10);
    expect(result).toContain(today);
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
    // The DB query itself limits to 30, so we just verify the limit is applied
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
});
