'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTasks, useDayRules, useRecurring } from '@/lib/api/hooks';
import { useActiveTask } from '@/lib/state/activeTask';
import { weekDays, mondayOf, todayISO, addDaysISO, weekRangeLabel, isToday, formatTimeShort, addTime } from '@/lib/utils/dates';
import { WeekStackMode } from '@/components/WeekStackMode';
import { WeekCalendarMode } from '@/components/WeekCalendarMode';
import { WeekDayHeader } from '@/components/WeekDayHeader';
import { TaskBlock } from '@/components/TaskBlock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, RecurringTask, DayRule, DayFocus } from '@/lib/types';

type ViewMode = 'calendar' | 'stack';

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-raised rounded" />
      <div className="h-8 w-64 bg-surface-raised rounded" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-[400px] bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun, 1=Mon, ...
  return d === 0 ? 6 : d - 1; // convert to 0=Mon, 6=Sun
}

export default function WeekPage() {
  useEffect(() => { document.title = 'Week · Personal OS'; }, []);

  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()));
  const [mode, setMode] = useState<ViewMode>('stack');
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const { data: tasks, isLoading: loadingTasks } = useTasks();
  const { data: dayRules, isLoading: loadingRules } = useDayRules();
  const { data: recurring, isLoading: loadingRecurring } = useRecurring();
  const { activeTaskId, setActiveTaskId } = useActiveTask();

  const isLoading = loadingTasks || loadingRules || loadingRecurring;

  // Group tasks by assignedDay
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const day of days) map[day] = [];
    for (const t of tasks ?? []) {
      if (t.assignedDay && map[t.assignedDay]) {
        map[t.assignedDay].push(t);
      }
    }
    return map;
  }, [tasks, days]);

  // Group recurring by daysOfWeek
  const recurringByDay = useMemo(() => {
    const map: Record<string, RecurringTask[]> = {};
    for (const day of days) map[day] = [];
    for (const r of recurring ?? []) {
      if (!r.active) continue;
      for (const day of days) {
        const dow = new Date(`${day}T12:00:00`).getDay();
        if (r.daysOfWeek.includes(dow)) {
          map[day].push(r);
        }
      }
    }
    return map;
  }, [recurring, days]);

  // Day rules map (dayOfWeek → DayRule)
  const dayRulesMap = useMemo(() => {
    const map: Record<number, DayRule> = {};
    for (const r of dayRules ?? []) {
      map[r.dayOfWeek] = r;
    }
    return map;
  }, [dayRules]);

  // Navigation
  const goToday = useCallback(() => {
    setWeekStart(mondayOf(todayISO()));
    setSelectedDayIndex(todayDayIndex());
  }, []);
  const goPrev = useCallback(() => setWeekStart(prev => mondayOf(addDaysISO(prev, -7))), []);
  const goNext = useCallback(() => setWeekStart(prev => mondayOf(addDaysISO(prev, 7))), []);

  // Keyboard shortcuts (disabled when task detail panel is open)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (activeTaskId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToday(); }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setMode(m => m === 'calendar' ? 'stack' : 'calendar');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, goToday, activeTaskId]);

  function openTaskDetail(id: string) {
    setActiveTaskId(id);
  }

  if (isLoading) return <Skeleton />;

  const isCurrentWeek = weekStart === mondayOf(todayISO());

  // Mobile single-day data
  const selectedDay = days[selectedDayIndex];
  const selectedDayTasks = tasksByDay[selectedDay] ?? [];
  const selectedDayRecurring = recurringByDay[selectedDay] ?? [];
  const selectedDow = new Date(`${selectedDay}T12:00:00`).getDay();
  const selectedRule = dayRulesMap[selectedDow];
  const selectedTotalMinutes =
    selectedDayTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0) +
    selectedDayRecurring.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);

  const sortedDayTasks = [...selectedDayTasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return a.priority - b.priority;
  });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <ErrorBoundary>
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary">Week</h1>

        <div className="flex items-center gap-3">
          {/* Mode toggle — desktop only */}
          <div className="hidden md:flex bg-surface-raised rounded-lg p-0.5">
            <button
              onClick={() => setMode('calendar')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'calendar'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setMode('stack')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'stack'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Stack
            </button>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={goPrev}
          className="p-1.5 rounded-lg hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
          aria-label="Previous week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToday}
          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
            isCurrentWeek
              ? 'bg-accent text-white border-accent'
              : 'bg-surface text-secondary border-border hover:border-accent hover:text-accent'
          }`}
        >
          Today
        </button>

        <button
          onClick={goNext}
          className="p-1.5 rounded-lg hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
          aria-label="Next week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <span className="text-sm font-medium text-primary">
          {weekRangeLabel(weekStart)}
        </span>
      </div>

      {/* ── Mobile: Single-day view ── */}
      <div className="md:hidden space-y-3">
        {/* Day navigation row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDayIndex(i => Math.max(0, i - 1))}
            disabled={selectedDayIndex === 0}
            className="p-2 rounded-lg text-secondary hover:text-primary disabled:opacity-30 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Day dots */}
          <div className="flex items-center gap-2">
            {dayNames.map((name, i) => {
              const dayISO = days[i];
              const isSel = i === selectedDayIndex;
              const isTod = isToday(dayISO);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDayIndex(i)}
                  className={`
                    w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors
                    ${isSel
                      ? 'bg-accent text-white'
                      : isTod
                        ? 'text-accent border border-accent'
                        : 'text-secondary hover:text-primary'
                    }
                  `}
                >
                  {name[0]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setSelectedDayIndex(i => Math.min(6, i + 1))}
            disabled={selectedDayIndex === 6}
            className="p-2 rounded-lg text-secondary hover:text-primary disabled:opacity-30 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day card */}
        <div className={`bg-surface rounded-xl p-4 ${isToday(selectedDay) ? 'ring-2 ring-accent' : ''}`}>
          <WeekDayHeader
            dateISO={selectedDay}
            focusArea={selectedRule?.focusArea as DayFocus}
            hoursUsed={selectedTotalMinutes / 60}
            hoursCap={selectedRule?.maxFocusHours ?? 8}
          />

          {/* Tasks */}
          <div className="space-y-2 mt-3">
            {sortedDayTasks.length === 0 && selectedDayRecurring.length === 0 && (
              <p className="text-center text-tertiary text-sm py-8">No tasks scheduled</p>
            )}
            {sortedDayTasks.map(task => (
              <div key={task.id}>
                {task.scheduledTime && (
                  <p className="text-xs text-secondary mb-0.5 pl-1">
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
                  onClick={() => openTaskDetail(task.id)}
                />
              </div>
            ))}

            {/* Recurring */}
            {selectedDayRecurring.length > 0 && sortedDayTasks.length > 0 && (
              <div className="border-t border-border pt-2" />
            )}
            {selectedDayRecurring.map(r => (
              <div key={r.id}>
                {r.scheduledTime && (
                  <p className="text-xs text-secondary mb-0.5 pl-1">
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
        </div>
      </div>

      {/* ── Desktop: Full week view ── */}
      <div className="hidden md:block">
        {mode === 'stack' ? (
          <WeekStackMode
            days={days}
            tasksByDay={tasksByDay}
            recurringByDay={recurringByDay}
            dayRulesMap={dayRulesMap}
            onClickTask={openTaskDetail}
          />
        ) : (
          <WeekCalendarMode
            days={days}
            tasksByDay={tasksByDay}
            recurringByDay={recurringByDay}
            dayRulesMap={dayRulesMap}
            onClickTask={openTaskDetail}
          />
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
