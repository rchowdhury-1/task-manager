import { describe, it, expect } from 'vitest';
import { resolveDropTarget } from '@/lib/utils/board';
import { makeTask } from './helpers/fixtures';

const MOCK_TASKS = [
  makeTask({ id: 'task-1', title: 'Task 1', status: 'backlog', priority: 2 }),
  makeTask({
    id: 'task-2',
    title: 'Task 2',
    category: 'lms',
    status: 'in_progress',
    priority: 1,
    durationMinutes: 90,
    timeLoggedMinutes: 30,
  }),
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
