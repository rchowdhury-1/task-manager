import type { Task } from '@/lib/types';

/**
 * Not a *.test.ts(x) file — vitest.config.ts's include glob only picks up
 * __tests__/**\/*.test.ts(x), so this module is never collected as a suite
 * of its own. Safe to import from any test file.
 */
export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1',
    userId: 'u1',
    title: 'Test task',
    description: null,
    category: 'career',
    status: 'backlog',
    priority: 2,
    assignedDay: null,
    scheduledTime: null,
    durationMinutes: 60,
    timeLoggedMinutes: 0,
    lastLeftOff: null,
    nextSteps: [],
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeTasks(n: number, each?: (i: number) => Partial<Task>): Task[] {
  return Array.from({ length: n }, (_, i) =>
    makeTask({ id: `test-${i + 1}`, title: `Test task ${i + 1}`, ...each?.(i) })
  );
}
