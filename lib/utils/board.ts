import type { Status, Task } from '@/lib/types';

const STATUSES: Status[] = ['backlog', 'this_week', 'in_progress', 'done'];

/**
 * Given a drag-over target ID and the full task list, resolves which
 * column (status) the task should be moved to.
 *
 * Returns the target status, or null if it can't be resolved (e.g. dropped
 * outside any droppable).
 *
 * over.id can be:
 *   - A column status string ('backlog', 'this_week', etc.)
 *   - A task id (dropped onto a card — derive status from that card)
 */
export function resolveDropTarget(
  overId: string | number | undefined | null,
  allTasks: Task[],
): Status | null {
  if (!overId) return null;

  const id = String(overId);

  // Check if it's a column id
  if (STATUSES.includes(id as Status)) return id as Status;

  // Otherwise look for a task with this id
  const targetTask = allTasks.find(t => t.id === id);
  if (targetTask) return targetTask.status;

  return null;
}
