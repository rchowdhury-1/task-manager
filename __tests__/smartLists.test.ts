import { describe, it, expect } from 'vitest';
import { SMART_LISTS } from '@/lib/lists/smartLists';
import { isWithinNextDays, daysSince } from '@/lib/utils/dates';
import type { Task } from '@/lib/types';

function makeTask(overrides: Partial<Task> = {}): Task {
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

describe('SMART_LISTS filters', () => {
  describe('all_open', () => {
    it('includes tasks that are not done', () => {
      const task = makeTask({ status: 'backlog' });
      expect(SMART_LISTS.all_open.filter(task)).toBe(true);
    });

    it('excludes done tasks', () => {
      const task = makeTask({ status: 'done' });
      expect(SMART_LISTS.all_open.filter(task)).toBe(false);
    });
  });

  describe('priorities', () => {
    it('includes P1 tasks that are not done', () => {
      const task = makeTask({ priority: 1, status: 'in_progress' });
      expect(SMART_LISTS.priorities.filter(task)).toBe(true);
    });

    it('excludes P2 tasks', () => {
      const task = makeTask({ priority: 2, status: 'backlog' });
      expect(SMART_LISTS.priorities.filter(task)).toBe(false);
    });

    it('excludes done P1 tasks', () => {
      const task = makeTask({ priority: 1, status: 'done' });
      expect(SMART_LISTS.priorities.filter(task)).toBe(false);
    });
  });

  describe('due_this_week', () => {
    it('includes tasks assigned within next 7 days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const iso = tomorrow.toISOString().slice(0, 10);
      const task = makeTask({ assignedDay: iso, status: 'backlog' });
      expect(SMART_LISTS.due_this_week.filter(task)).toBe(true);
    });

    it('excludes tasks assigned far in the future', () => {
      const farAway = new Date();
      farAway.setDate(farAway.getDate() + 30);
      const iso = farAway.toISOString().slice(0, 10);
      const task = makeTask({ assignedDay: iso, status: 'backlog' });
      expect(SMART_LISTS.due_this_week.filter(task)).toBe(false);
    });

    it('excludes tasks with no assigned day', () => {
      const task = makeTask({ assignedDay: null, status: 'backlog' });
      expect(SMART_LISTS.due_this_week.filter(task)).toBe(false);
    });
  });

  describe('stale', () => {
    it('includes tasks older than 14 days that are not done', () => {
      const old = new Date();
      old.setDate(old.getDate() - 20);
      const task = makeTask({ createdAt: old.toISOString(), status: 'backlog' });
      expect(SMART_LISTS.stale.filter(task)).toBe(true);
    });

    it('excludes recent tasks', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 3);
      const task = makeTask({ createdAt: recent.toISOString(), status: 'backlog' });
      expect(SMART_LISTS.stale.filter(task)).toBe(false);
    });

    it('excludes done tasks even if old', () => {
      const old = new Date();
      old.setDate(old.getDate() - 30);
      const task = makeTask({ createdAt: old.toISOString(), status: 'done' });
      expect(SMART_LISTS.stale.filter(task)).toBe(false);
    });
  });
});

describe('date helpers', () => {
  describe('isWithinNextDays', () => {
    it('returns true for a date 3 days from now with n=7', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const iso = future.toISOString().slice(0, 10);
      expect(isWithinNextDays(iso, 7)).toBe(true);
    });

    it('returns false for a date 10 days from now with n=7', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const iso = future.toISOString().slice(0, 10);
      expect(isWithinNextDays(iso, 7)).toBe(false);
    });
  });

  describe('daysSince', () => {
    it('returns correct number of days for a past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const result = daysSince(past.toISOString());
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(5);
    });
  });
});
