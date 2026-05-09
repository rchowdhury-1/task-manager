'use client';
import { WeekDayHeader } from './WeekDayHeader';
import { TaskBlock } from './TaskBlock';
import { isToday, formatTimeShort, addTime } from '@/lib/utils/dates';
import type { Task, RecurringTask, DayRule, DayFocus } from '@/lib/types';

interface WeekStackModeProps {
  days: string[];
  tasksByDay: Record<string, Task[]>;
  recurringByDay: Record<string, RecurringTask[]>;
  dayRulesMap: Record<number, DayRule>;
  onClickTask: (id: string) => void;
}

export function WeekStackMode({
  days,
  tasksByDay,
  recurringByDay,
  dayRulesMap,
  onClickTask,
}: WeekStackModeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 overflow-x-auto">
      {days.map((day, i) => {
        const tasks = tasksByDay[day] ?? [];
        const recurring = recurringByDay[day] ?? [];
        const dow = new Date(`${day}T12:00:00`).getDay();
        const rule = dayRulesMap[dow];
        const totalMinutes =
          tasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0) +
          recurring.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
        const today = isToday(day);

        // Sort tasks by scheduledTime ASC (nulls last), then priority
        const sorted = [...tasks].sort((a, b) => {
          if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
          if (a.scheduledTime) return -1;
          if (b.scheduledTime) return 1;
          return a.priority - b.priority;
        });

        return (
          <div
            key={day}
            className={`
              bg-surface rounded-xl p-2 min-h-[500px] flex flex-col
              ${today ? 'ring-2 ring-accent' : ''}
            `}
          >
            <WeekDayHeader
              dateISO={day}
              focusArea={rule?.focusArea as DayFocus}
              hoursUsed={totalMinutes / 60}
              hoursCap={rule?.maxFocusHours ?? 8}
            />

            <div className="flex-1 space-y-1.5 mt-2">
              {sorted.length === 0 && recurring.length === 0 && (
                <p className="text-center text-tertiary text-sm py-8">—</p>
              )}
              {sorted.map(task => (
                <div key={task.id}>
                  {task.scheduledTime && (
                    <p className="text-[10px] text-secondary mb-0.5 pl-1">
                      {formatTimeShort(task.scheduledTime)} - {formatTimeShort(addTime(task.scheduledTime, task.durationMinutes))}
                    </p>
                  )}
                  <TaskBlock
                    title={task.title}
                    category={task.category}
                    priority={task.priority}
                    durationMinutes={task.durationMinutes}
                    scheduledTime={task.scheduledTime ?? undefined}
                    status={task.status}
                    pixelsPerMinute={0.8}
                    onClick={() => onClickTask(task.id)}
                  />
                </div>
              ))}

              {/* Recurring pinned at bottom */}
              {recurring.length > 0 && (
                <div className="mt-auto pt-2 space-y-1.5">
                  {recurring.map(r => (
                    <div key={r.id}>
                      {r.scheduledTime && (
                        <p className="text-[10px] text-secondary mb-0.5 pl-1">
                          {formatTimeShort(r.scheduledTime)} - {formatTimeShort(addTime(r.scheduledTime, r.durationMinutes))}
                        </p>
                      )}
                      <TaskBlock
                        title={r.title}
                        category={r.category}
                        priority={r.priority ?? 2}
                        durationMinutes={r.durationMinutes}
                        scheduledTime={r.scheduledTime ?? undefined}
                        status="backlog"
                        isRecurring
                        pixelsPerMinute={0.8}
                        onClick={() => {}}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total hours at bottom */}
            <div className="text-center text-[10px] text-tertiary mt-2 pt-1 border-t border-border">
              {(totalMinutes / 60).toFixed(1)}h
            </div>
          </div>
        );
      })}
    </div>
  );
}
