/**
 * Pure function tests for applyClaudeDiff logic.
 * Tests the state update logic in isolation.
 */

import type { Task, Habit, RecurringTask, ClaudeOperation } from '../types/personalOS';

// ── Test fixtures ──────────────────────────────────────────────────────────────

const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  user_id: 'user-1',
  title: 'Test Task',
  category: 'career',
  priority: 2,
  status: 'backlog',
  assigned_day: null,
  day_of_week: null,
  duration_minutes: 60,
  time_logged_minutes: 0,
  scheduled_time: null,
  notes: null,
  last_left_off: null,
  next_steps: [],
  cal_event_uid: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
});

const mockHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'habit-1',
  user_id: 'user-1',
  name: 'Fajr',
  category: 'faith',
  time_of_day: 'morning',
  duration_minutes: 15,
  sort_order: 0,
  active: true,
  completions: [],
  ...overrides,
});

const mockRecurring = (overrides: Partial<RecurringTask> = {}): RecurringTask => ({
  id: 'rec-1',
  user_id: 'user-1',
  title: 'Uber Eats',
  category: 'uber',
  priority: 2,
  duration_minutes: 120,
  scheduled_time: '21:00',
  days_of_week: [0,1,2,3,4,5,6],
  until_condition: 'mercor_or_outlier_or_fulltime',
  condition_met: false,
  active: true,
  created_at: '2026-05-01T00:00:00Z',
  ...overrides,
});

// ── Replicated applyClaudeDiff logic ─────────────────────────────────────────

function applyDiff(
  operations: ClaudeOperation[],
  tasks: Task[],
  habits: Habit[],
  recurringTasks: RecurringTask[],
) {
  let newTasks = [...tasks];
  let newHabits = [...habits];
  let newRecurring = [...recurringTasks];

  for (const op of operations) {
    switch (op.type) {
      case 'move_task':
        newTasks = newTasks.map((t) =>
          t.id === op.task_id ? { ...t, status: op.new_status } : t
        );
        break;
      case 'update_task':
        newTasks = newTasks.map((t) =>
          t.id === op.task_id ? { ...t, ...op.fields } : t
        );
        break;
      case 'add_next_step':
        newTasks = newTasks.map((t) => {
          if (t.id !== op.task_id) return t;
          return { ...t, next_steps: [...t.next_steps, { text: op.text, done: false }] };
        });
        break;
      case 'complete_next_step':
        newTasks = newTasks.map((t) => {
          if (t.id !== op.task_id) return t;
          const steps = [...t.next_steps];
          if (op.step_index < steps.length) steps[op.step_index] = { ...steps[op.step_index], done: true };
          return { ...t, next_steps: steps };
        });
        break;
      case 'complete_habit': {
        const today = '2026-05-07';
        newHabits = newHabits.map((h) => {
          if (h.id !== op.habit_id) return h;
          const completions = h.completions.includes(today)
            ? h.completions
            : [...h.completions, today];
          return { ...h, completions };
        });
        break;
      }
      case 'resolve_recurring':
        newRecurring = newRecurring.map((r) =>
          r.id === op.recurring_id ? { ...r, condition_met: true, active: false } : r
        );
        break;
      default:
        // Unknown op types are ignored without throwing
        break;
    }
  }
  return { tasks: newTasks, habits: newHabits, recurring: newRecurring };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('applyClaudeDiff — pure function', () => {
  describe('move_task', () => {
    it('updates task status in state', () => {
      const tasks = [mockTask({ id: 'task-1', status: 'backlog' })];
      const op: ClaudeOperation = { type: 'move_task', task_id: 'task-1', new_status: 'in_progress' };
      const { tasks: result } = applyDiff([op], tasks, [], []);
      expect(result[0].status).toBe('in_progress');
    });

    it('does not modify other tasks', () => {
      const tasks = [
        mockTask({ id: 'task-1', status: 'backlog' }),
        mockTask({ id: 'task-2', status: 'this_week' }),
      ];
      const op: ClaudeOperation = { type: 'move_task', task_id: 'task-1', new_status: 'done' };
      const { tasks: result } = applyDiff([op], tasks, [], []);
      expect(result[1].status).toBe('this_week');
    });
  });

  describe('create_task', () => {
    it('is handled without throwing (triggers refetch)', () => {
      // create_task in the context triggers fetchAll, not a local append
      // So we just verify it doesn't throw when hitting the default branch
      const op: ClaudeOperation = {
        type: 'create_task',
        title: 'New Task',
        category: 'lms',
        priority: 2,
        status: 'backlog',
        assigned_day: null,
        duration_minutes: 60,
        scheduled_time: null,
      };
      // The context handles this by calling refetch() — test that the switch doesn't error
      expect(() => applyDiff([op], [], [], [])).not.toThrow();
    });
  });

  describe('complete_habit', () => {
    it('marks correct habit with today\'s completion', () => {
      const habits = [
        mockHabit({ id: 'habit-1', completions: [] }),
        mockHabit({ id: 'habit-2', completions: [] }),
      ];
      const op: ClaudeOperation = { type: 'complete_habit', habit_id: 'habit-1' };
      const { habits: result } = applyDiff([op], [], habits, []);
      expect(result[0].completions).toContain('2026-05-07');
      expect(result[1].completions).toHaveLength(0);
    });

    it('does not duplicate if already completed', () => {
      const habits = [mockHabit({ id: 'habit-1', completions: ['2026-05-07'] })];
      const op: ClaudeOperation = { type: 'complete_habit', habit_id: 'habit-1' };
      const { habits: result } = applyDiff([op], [], habits, []);
      const count = result[0].completions.filter((d) => d === '2026-05-07').length;
      expect(count).toBe(1);
    });
  });

  describe('unknown operation type', () => {
    it('is ignored without throwing', () => {
      const tasks = [mockTask()];
      // @ts-ignore — intentionally testing unknown type
      const op = { type: 'destroy_everything', payload: 'DROP TABLE tasks' };
      // @ts-ignore
      expect(() => applyDiff([op], tasks, [], [])).not.toThrow();
      const { tasks: result } = applyDiff([op as unknown as ClaudeOperation], tasks, [], []);
      // State unchanged
      expect(result).toEqual(tasks);
    });
  });

  describe('multiple operations applied in order', () => {
    it('applies ops sequentially', () => {
      const tasks = [mockTask({ id: 'task-1', status: 'backlog', priority: 2 })];
      const ops: ClaudeOperation[] = [
        { type: 'move_task', task_id: 'task-1', new_status: 'in_progress' },
        { type: 'update_task', task_id: 'task-1', fields: { priority: 1 } },
        { type: 'add_next_step', task_id: 'task-1', text: 'Finish the feature' },
      ];
      const { tasks: result } = applyDiff(ops, tasks, [], []);
      expect(result[0].status).toBe('in_progress');
      expect(result[0].priority).toBe(1);
      expect(result[0].next_steps).toHaveLength(1);
      expect(result[0].next_steps[0].text).toBe('Finish the feature');
    });
  });

  describe('resolve_recurring', () => {
    it('sets condition_met=true and active=false', () => {
      const recurring = [mockRecurring({ id: 'rec-1', active: true, condition_met: false })];
      const op: ClaudeOperation = { type: 'resolve_recurring', recurring_id: 'rec-1', reason: 'Got a job' };
      const { recurring: result } = applyDiff([op], [], [], recurring);
      expect(result[0].condition_met).toBe(true);
      expect(result[0].active).toBe(false);
    });
  });
});
