import { describe, it, expect } from 'vitest';
import { resolveDropTarget } from '@/lib/utils/board';
import type { Task } from '@/lib/types';

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    userId: 'u1',
    title: 'Task 1',
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
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    userId: 'u1',
    title: 'Task 2',
    description: null,
    category: 'lms',
    status: 'in_progress',
    priority: 1,
    assignedDay: null,
    scheduledTime: null,
    durationMinutes: 90,
    timeLoggedMinutes: 30,
    lastLeftOff: null,
    nextSteps: [],
    notes: null,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('resolveDropTarget', () => {
  it('resolves a column status string directly', () => {
    expect(resolveDropTarget('in_progress', MOCK_TASKS)).toBe('in_progress');
    expect(resolveDropTarget('backlog', MOCK_TASKS)).toBe('backlog');
    expect(resolveDropTarget('this_week', MOCK_TASKS)).toBe('this_week');
    expect(resolveDropTarget('done', MOCK_TASKS)).toBe('done');
  });

  it('derives status from a target task id', () => {
    // Dropping onto task-2 which is in_progress
    expect(resolveDropTarget('task-2', MOCK_TASKS)).toBe('in_progress');
    // Dropping onto task-1 which is backlog
    expect(resolveDropTarget('task-1', MOCK_TASKS)).toBe('backlog');
  });

  it('returns null for unknown target', () => {
    expect(resolveDropTarget(null, MOCK_TASKS)).toBeNull();
    expect(resolveDropTarget(undefined, MOCK_TASKS)).toBeNull();
    expect(resolveDropTarget('nonexistent-id', MOCK_TASKS)).toBeNull();
  });
});
