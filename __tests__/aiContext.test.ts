import { describe, it, expect, vi } from 'vitest';

// Mock the schema imports before importing the module
vi.mock('@/lib/db/schema', () => ({
  users: { id: 'id', timezone: 'timezone' },
  tasks: { userId: 'userId' },
  habits: { userId: 'userId' },
  dayRules: { userId: 'userId' },
  recurringTasks: { userId: 'userId' },
}));

vi.mock('@/lib/utils/timezone', () => ({
  todayInTimezone: () => '2026-06-01',
}));

import { buildUserContext } from '@/lib/ai/context';

function mockDb(data: { tasks?: unknown[]; habits?: unknown[]; dayRules?: unknown[]; recurring?: unknown[] } = {}) {
  const taskData = data.tasks ?? [];
  const habitData = data.habits ?? [];
  const dayRuleData = data.dayRules ?? [];
  const recurringData = data.recurring ?? [];

  let callCount = 0;

  const select = vi.fn().mockImplementation(() => {
    const currentCall = callCount++;
    // Call 0 = users query, Call 1 = tasks, Call 2 = habits, Call 3 = dayRules, Call 4 = recurring
    const allData = [
      [{ timezone: 'Europe/London' }],  // users
      taskData,
      habitData,
      dayRuleData,
      recurringData,
    ];
    const resolvedData = allData[currentCall] ?? [];

    const mockLimit = vi.fn().mockResolvedValue(resolvedData);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockImplementation(() => {
      // users path (0) has limit; tasks path (1) has orderBy→limit; others resolve directly
      if (currentCall === 0) return { limit: mockLimit };
      if (currentCall === 1) return { orderBy: mockOrderBy };
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
});
