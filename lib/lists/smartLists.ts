import type { Task } from '@/lib/types';
import { isWithinNextDays, daysSince } from '@/lib/utils/dates';

export type SmartListKey = 'all_open' | 'priorities' | 'due_this_week' | 'stale';

export const SMART_LISTS: Record<SmartListKey, { label: string; icon: string; filter: (t: Task) => boolean }> = {
  all_open: {
    label: 'All open',
    icon: 'list',
    filter: (t) => t.status !== 'done',
  },
  priorities: {
    label: 'Priorities',
    icon: 'zap',
    filter: (t) => t.status !== 'done' && t.priority === 1,
  },
  due_this_week: {
    label: 'This week',
    icon: 'calendar',
    filter: (t) => t.status !== 'done' && !!t.assignedDay && isWithinNextDays(t.assignedDay, 7),
  },
  stale: {
    label: 'Stale (>14d)',
    icon: 'clock',
    filter: (t) => t.status !== 'done' && daysSince(t.createdAt) > 14,
  },
};
