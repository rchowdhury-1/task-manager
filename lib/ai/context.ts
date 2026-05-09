import { eq, desc } from 'drizzle-orm';
import { tasks, habits, dayRules, recurringTasks } from '@/lib/db/schema';
import type { DB } from '@/lib/db';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_TASKS = 30;

export async function buildUserContext(userId: string, db: DB): Promise<string> {
  const [userTasks, userHabits, userDayRules, userRecurring] = await Promise.all([
    db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.updatedAt))
      .limit(MAX_TASKS),
    db.select()
      .from(habits)
      .where(eq(habits.userId, userId)),
    db.select()
      .from(dayRules)
      .where(eq(dayRules.userId, userId)),
    db.select()
      .from(recurringTasks)
      .where(eq(recurringTasks.userId, userId)),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [`Current state (as of ${today}):\n`];

  // Tasks
  lines.push(`Tasks (${userTasks.length}):`);
  if (userTasks.length === 0) {
    lines.push('- (none)');
  } else {
    for (const t of userTasks) {
      const parts = [
        `'${t.title}'`,
        `(${t.category}, P${t.priority}, ${t.status}`,
      ];
      if (t.assignedDay) parts.push(`, ${t.assignedDay}`);
      if (t.scheduledTime) parts.push(` ${t.scheduledTime}`);
      if (t.durationMinutes) parts.push(`, ${t.durationMinutes}m`);
      parts.push(')');
      lines.push(`- ${t.id}: ${parts.join('')}`);
    }
  }

  // Habits
  lines.push(`\nHabits (${userHabits.length}):`);
  if (userHabits.length === 0) {
    lines.push('- (none)');
  } else {
    for (const h of userHabits) {
      const active = h.active ? '' : ' [inactive]';
      lines.push(`- ${h.id}: '${h.name}' (${h.section}${h.timeOfDay ? `, ${h.timeOfDay}` : ''})${active}`);
    }
  }

  // Day rules
  lines.push('\nDay rules:');
  if (userDayRules.length === 0) {
    lines.push('- (defaults)');
  } else {
    const sorted = [...userDayRules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    for (const r of sorted) {
      lines.push(`- ${DAY_NAMES[r.dayOfWeek]}: ${r.focusArea} (${r.maxFocusHours}h)`);
    }
  }

  // Recurring
  lines.push(`\nRecurring (${userRecurring.length}):`);
  if (userRecurring.length === 0) {
    lines.push('- (none)');
  } else {
    for (const r of userRecurring) {
      const days = (r.daysOfWeek ?? []).map(d => DAY_NAMES[d]).join(',');
      const time = r.scheduledTime ? ` ${r.scheduledTime}` : '';
      const active = r.active ? '' : ' [inactive]';
      lines.push(`- ${r.id}: '${r.title}' (${r.category}, ${days}${time}, ${r.durationMinutes}m)${active}`);
    }
  }

  return lines.join('\n');
}
