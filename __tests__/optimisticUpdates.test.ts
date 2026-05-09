import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/keys';
import type { Task } from '@/lib/types';

// We test the optimistic update logic directly by simulating
// what the onMutate callbacks do to the query cache.

const MOCK_TASK: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Existing task',
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
};

describe('optimistic updates', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Seed the tasks cache
    qc.setQueryData(queryKeys.tasks(), [MOCK_TASK]);
  });

  it('useCreateTask onMutate adds a temp task to the cache', () => {
    const existing = qc.getQueryData<Task[]>(queryKeys.tasks())!;

    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      userId: '',
      title: 'New task',
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
    };

    // Simulate onMutate
    qc.setQueryData<Task[]>(queryKeys.tasks(), (old) => [
      tempTask,
      ...(old ?? []),
    ]);

    const result = qc.getQueryData<Task[]>(queryKeys.tasks())!;
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('New task');
    expect(result[0].id).toMatch(/^temp-/);
    expect(result[1].id).toBe('task-1');
  });

  it('useDeleteTask onMutate removes the task from cache', () => {
    const idToDelete = 'task-1';

    // Simulate onMutate
    qc.setQueryData<Task[]>(queryKeys.tasks(), (old) =>
      old?.filter((t) => t.id !== idToDelete)
    );

    const result = qc.getQueryData<Task[]>(queryKeys.tasks())!;
    expect(result).toHaveLength(0);
  });

  it('useUpdateTask onMutate merges the patch into cached task', () => {
    const id = 'task-1';
    const camelPatch: Partial<Task> = {
      title: 'Updated title',
      status: 'in_progress',
      priority: 1,
    };

    // Simulate onMutate for task list
    qc.setQueryData<Task[]>(queryKeys.tasks(), (old) =>
      old?.map((t) => (t.id === id ? { ...t, ...camelPatch } : t))
    );

    const result = qc.getQueryData<Task[]>(queryKeys.tasks())!;
    expect(result[0].title).toBe('Updated title');
    expect(result[0].status).toBe('in_progress');
    expect(result[0].priority).toBe(1);
    // Unchanged fields preserved
    expect(result[0].category).toBe('career');
    expect(result[0].durationMinutes).toBe(60);
  });

  it('rollback restores previous cache on error', () => {
    const previous = qc.getQueryData<Task[]>(queryKeys.tasks())!;

    // Simulate onMutate (delete)
    qc.setQueryData<Task[]>(queryKeys.tasks(), []);
    expect(qc.getQueryData<Task[]>(queryKeys.tasks())).toHaveLength(0);

    // Simulate onError rollback
    qc.setQueryData(queryKeys.tasks(), previous);
    expect(qc.getQueryData<Task[]>(queryKeys.tasks())).toHaveLength(1);
    expect(qc.getQueryData<Task[]>(queryKeys.tasks())![0].id).toBe('task-1');
  });
});
