'use client';
import { useState, useEffect } from 'react';
import { WeekDayHeader } from './WeekDayHeader';
import { TaskBlock } from './TaskBlock';
import { isToday, formatTimeShort, addTime } from '@/lib/utils/dates';
import type { Task, RecurringTask, DayRule, DayFocus } from '@/lib/types';

const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 17 hours
const PX_PER_HOUR = 60;
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;

interface WeekCalendarModeProps {
  days: string[];
  tasksByDay: Record<string, Task[]>;
  recurringByDay: Record<string, RecurringTask[]>;
  dayRulesMap: Record<number, DayRule>;
  onClickTask: (id: string) => void;
}

function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) * PX_PER_HOUR) + (m * PX_PER_HOUR / 60);
}

function HourLabels() {
  return (
    <div className="w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
      {Array.from({ length: TOTAL_HOURS }, (_, i) => {
        const hour = START_HOUR + i;
        const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
        return (
          <div
            key={hour}
            className="absolute text-[10px] text-tertiary -translate-y-1/2"
            style={{ top: i * PX_PER_HOUR }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function CurrentTimeLine() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  if (h < START_HOUR || h >= END_HOUR) return null;

  const top = ((h - START_HOUR) * PX_PER_HOUR) + (m * PX_PER_HOUR / 60);

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-[2px] bg-red-500" />
      </div>
    </div>
  );
}

export function WeekCalendarMode({
  days,
  tasksByDay,
  recurringByDay,
  dayRulesMap,
  onClickTask,
}: WeekCalendarModeProps) {
  return (
    <div className="flex flex-col">
      {/* Unscheduled strip */}
      <UnscheduledStrip
        days={days}
        tasksByDay={tasksByDay}
        recurringByDay={recurringByDay}
        dayRulesMap={dayRulesMap}
        onClickTask={onClickTask}
      />

      {/* Time grid */}
      <div className="flex overflow-x-auto">
        <HourLabels />
        <div className="flex-1 grid grid-cols-7 min-w-0">
          {days.map((day) => {
            const tasks = tasksByDay[day] ?? [];
            const recurring = recurringByDay[day] ?? [];
            const scheduled = tasks.filter(t => t.scheduledTime);
            const scheduledRecurring = recurring.filter(r => r.scheduledTime);
            const today = isToday(day);

            return (
              <div
                key={day}
                className={`relative border-l border-border ${today ? 'bg-accent/[0.03]' : ''}`}
                style={{ height: GRID_HEIGHT }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: i * PX_PER_HOUR }}
                  />
                ))}
                {/* Half-hour dashed lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`half-${i}`}
                    className="absolute left-0 right-0 border-t border-dashed border-border/30"
                    style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                  />
                ))}

                {/* Current time indicator */}
                {today && <CurrentTimeLine />}

                {/* Scheduled tasks */}
                {scheduled.map(task => {
                  const top = timeToOffset(task.scheduledTime!);
                  const height = Math.max(20, (task.durationMinutes / 60) * PX_PER_HOUR);
                  return (
                    <div
                      key={task.id}
                      className="absolute left-0.5 right-0.5 z-10"
                      style={{ top, height }}
                    >
                      <TaskBlock
                        title={task.title}
                        category={task.category}
                        priority={task.priority}
                        durationMinutes={task.durationMinutes}
                        scheduledTime={task.scheduledTime ?? undefined}
                        status={task.status}
                        pixelsPerMinute={PX_PER_HOUR / 60}
                        onClick={() => onClickTask(task.id)}
                      />
                    </div>
                  );
                })}

                {/* Scheduled recurring */}
                {scheduledRecurring.map(r => {
                  const top = timeToOffset(r.scheduledTime!);
                  const height = Math.max(20, (r.durationMinutes / 60) * PX_PER_HOUR);
                  return (
                    <div
                      key={r.id}
                      className="absolute left-0.5 right-0.5 z-10"
                      style={{ top, height }}
                    >
                      <TaskBlock
                        title={r.title}
                        category={r.category}
                        priority={r.priority ?? 2}
                        durationMinutes={r.durationMinutes}
                        scheduledTime={r.scheduledTime ?? undefined}
                        status="backlog"
                        isRecurring
                        pixelsPerMinute={PX_PER_HOUR / 60}
                        onClick={() => {}}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Strip above the grid showing unscheduled tasks */
function UnscheduledStrip({
  days,
  tasksByDay,
  recurringByDay,
  dayRulesMap,
  onClickTask,
}: WeekCalendarModeProps) {
  const hasAny = days.some(day => {
    const tasks = tasksByDay[day] ?? [];
    const recurring = recurringByDay[day] ?? [];
    return tasks.some(t => !t.scheduledTime) || recurring.some(r => !r.scheduledTime);
  });

  if (!hasAny) return null;

  return (
    <div className="mb-2">
      <p className="text-[10px] text-tertiary font-medium tracking-wide mb-1 pl-12">UNSCHEDULED</p>
      <div className="flex">
        <div className="w-12 shrink-0" />
        <div className="flex-1 grid grid-cols-7 gap-px min-w-0">
          {days.map(day => {
            const tasks = (tasksByDay[day] ?? []).filter(t => !t.scheduledTime);
            const recurring = (recurringByDay[day] ?? []).filter(r => !r.scheduledTime);
            const dow = new Date(`${day}T12:00:00`).getDay();
            const rule = dayRulesMap[dow];
            const totalMinutes =
              (tasksByDay[day] ?? []).reduce((s, t) => s + (t.durationMinutes ?? 0), 0) +
              (recurringByDay[day] ?? []).reduce((s, r) => s + (r.durationMinutes ?? 0), 0);

            return (
              <div key={day} className="px-0.5">
                <WeekDayHeader
                  dateISO={day}
                  focusArea={rule?.focusArea as DayFocus}
                  hoursUsed={totalMinutes / 60}
                  hoursCap={rule?.maxFocusHours ?? 8}
                />
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tasks.map(task => (
                    <TaskBlock
                      key={task.id}
                      title={task.title}
                      category={task.category}
                      priority={task.priority}
                      durationMinutes={task.durationMinutes}
                      status={task.status}
                      pixelsPerMinute={0.5}
                      onClick={() => onClickTask(task.id)}
                    />
                  ))}
                  {recurring.map(r => (
                    <TaskBlock
                      key={r.id}
                      title={r.title}
                      category={r.category}
                      priority={r.priority ?? 2}
                      durationMinutes={r.durationMinutes}
                      status="backlog"
                      isRecurring
                      pixelsPerMinute={0.5}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
