'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTasks, useDayRules, useRecurring } from '@/lib/api/hooks';
import { useActiveTask } from '@/lib/state/activeTask';
import { weekDays, mondayOf, todayISO, addDaysISO, weekRangeLabel } from '@/lib/utils/dates';
import { WeekStackMode } from '@/components/WeekStackMode';
import { WeekCalendarMode } from '@/components/WeekCalendarMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Task, RecurringTask, DayRule } from '@/lib/types';

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

export default function WeekPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()));
  const [mode, setMode] = useState<ViewMode>('stack');

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
  const goToday = useCallback(() => setWeekStart(mondayOf(todayISO())), []);
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

  return (
    <ErrorBoundary>
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary">Week</h1>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-surface-raised rounded-lg p-0.5">
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

      {/* View */}
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
    </ErrorBoundary>
  );
}
