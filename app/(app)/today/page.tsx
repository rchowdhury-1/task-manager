'use client';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useToday,
  useMe,
  useCreateTask,
  useCompleteHabit,
  useUncompleteHabit,
  useCompletions,
} from '@/lib/api/hooks';
import { useActiveTask } from '@/lib/state/activeTask';
import { TaskBlock } from '@/components/TaskBlock';
import { QuickAddInput, type ParsedTask } from '@/components/QuickAddInput';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CalendarCheck, Sparkles } from 'lucide-react';
import {
  todayISO,
  greeting,
  longDate,
  formatTimeShort,
  addTime,
  weekDays,
} from '@/lib/utils/dates';
import type { Task, RecurringTask, Habit, HabitCompletion, Section } from '@/lib/types';

const SECTION_ORDER: Section[] = ['faith', 'body', 'growth'];
const SECTION_LABELS: Record<Section, string> = {
  faith: 'FAITH',
  body: 'BODY',
  growth: 'GROWTH',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-64 bg-surface-raised rounded" />
        <div className="h-4 w-44 bg-surface-raised rounded" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-surface-raised rounded-lg" />
        ))}
      </div>
      {/* Quick add */}
      <div className="h-12 bg-surface-raised rounded-lg" />
      {/* Content */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-[2] space-y-3">
          <div className="h-5 w-40 bg-surface-raised rounded" />
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 bg-surface-raised rounded-lg" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 bg-surface-raised rounded" />
          {[0, 1].map(i => (
            <div key={i} className="h-32 bg-surface-raised rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 md:p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-secondary">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-p1' : pct >= 75 ? 'bg-p2' : 'bg-accent';
  return (
    <div className="h-1.5 w-full bg-surface-raised rounded-full mt-2">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Habit Row ───────────────────────────────────────────────────────────────

function HabitRow({
  habit,
  week,
  todayStr,
  completionsMap,
  onToggle,
}: {
  habit: Habit;
  week: string[];
  todayStr: string;
  completionsMap: Set<string>;
  onToggle: (habitId: string, date: string, done: boolean) => void;
}) {
  const todayDone = completionsMap.has(`${habit.id}:${todayStr}`);

  // Calculate streak ending at today
  let streak = 0;
  for (let i = week.indexOf(todayStr); i >= 0; i--) {
    if (completionsMap.has(`${habit.id}:${week[i]}`)) streak++;
    else break;
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">{habit.name}</p>
      </div>

      {/* Week dots */}
      <div className="hidden sm:flex items-center gap-1">
        {week.map((day, i) => {
          const done = completionsMap.has(`${habit.id}:${day}`);
          const isToday = day === todayStr;
          return (
            <div
              key={day}
              title={`${DAY_LABELS[i]} ${day}`}
              className={`
                w-4 h-4 rounded-sm
                ${done
                  ? 'bg-accent'
                  : 'bg-surface-raised'
                }
                ${isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-page' : ''}
              `}
            />
          );
        })}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <span className="text-xs text-orange-500 whitespace-nowrap">
          {streak}d 🔥
        </span>
      )}

      {/* Toggle button */}
      <button
        onClick={() => onToggle(habit.id, todayStr, todayDone)}
        aria-label={todayDone ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
        className={`
          w-7 h-7 rounded-full flex items-center justify-center shrink-0
          transition-colors
          ${todayDone
            ? 'bg-accent text-white'
            : 'border-2 border-border hover:border-accent'
          }
        `}
      >
        {todayDone && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TodayPage() {
  useEffect(() => { document.title = 'Today · Personal OS'; }, []);

  const today = todayISO();
  const week = useMemo(() => weekDays(today), [today]);
  const mondayStr = week[0];
  const sundayStr = week[6];

  const { data: me } = useMe();
  const { data, isLoading, error, refetch } = useToday(today);
  const { data: weekCompletions } = useCompletions(mondayStr, sundayStr);
  const createTask = useCreateTask();
  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();
  const { setActiveTaskId } = useActiveTask();

  // Build completions lookup: "habitId:date" → true
  const completionsMap = useMemo(() => {
    const set = new Set<string>();
    // Today's completions from useToday
    data?.completions?.forEach(c => set.add(`${c.habit_id}:${c.date}`));
    // Week completions from useCompletions
    weekCompletions?.forEach(c => set.add(`${c.habit_id}:${c.date}`));
    return set;
  }, [data?.completions, weekCompletions]);

  const handleQuickAdd = (parsed: ParsedTask) => {
    createTask.mutate(
      {
        title: parsed.title,
        category: parsed.category ?? 'career',
        priority: parsed.priority ?? 2,
        status: 'backlog',
        assigned_day: parsed.assignedDay ?? today,
        scheduled_time: parsed.scheduledTime,
        duration_minutes: parsed.durationMinutes ?? 60,
        next_steps: [],
      },
      {
        onSuccess: () => toast.success('Task created'),
        onError: () => toast.error("Couldn't create task. Try again."),
      },
    );
  };

  const handleHabitToggle = (habitId: string, date: string, currentlyDone: boolean) => {
    if (currentlyDone) {
      uncompleteHabit.mutate({ habitId, date });
    } else {
      completeHabit.mutate({ habitId, date });
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) return <Skeleton />;

  // ─── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-accent-muted border border-accent rounded-lg p-4 flex items-center gap-3">
        <span className="text-p1 text-sm flex-1">
          Error: {(error as Error).message}
        </span>
        <button
          onClick={() => refetch()}
          className="text-sm font-medium text-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // ─── Derived data ────────────────────────────────────────────────────────

  const todayTasks = [...data.tasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return a.priority - b.priority;
  });

  const recurringToday = data.recurring;

  const p1Count = data.tasks.filter(t => t.priority === 1 && t.status !== 'done').length;

  const scheduledMinutes =
    data.tasks.reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0) +
    data.recurring.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  const scheduledHours = Math.round((scheduledMinutes / 60) * 10) / 10;
  const capHours = data.dayRule?.maxFocusHours ?? 8;

  const activeHabits = data.habits.filter(h => h.active);
  const habitsDoneToday = activeHabits.filter(h =>
    completionsMap.has(`${h.id}:${today}`)
  ).length;

  // Next event: earliest task/recurring with scheduledTime after current time
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const allScheduled: { title: string; time: string }[] = [
    ...data.tasks
      .filter(t => t.scheduledTime && t.status !== 'done')
      .map(t => ({ title: t.title, time: t.scheduledTime! })),
    ...data.recurring
      .filter(r => r.scheduledTime)
      .map(r => ({ title: r.title, time: r.scheduledTime! })),
  ]
    .filter(e => e.time > nowTime)
    .sort((a, b) => a.time.localeCompare(b.time));

  const nextEvent = allScheduled[0];

  // Group habits by section
  const habitsBySection = SECTION_ORDER
    .map(s => ({
      section: s,
      habits: activeHabits.filter(h => h.section === s),
    }))
    .filter(g => g.habits.length > 0);

  const name = me?.name?.split(' ')[0] ?? '';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-[1100px]">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          {greeting()}{name ? `, ${name}` : ''}
        </h1>
        <p className="text-sm text-secondary mt-0.5">{longDate()}</p>
      </div>

      {/* Stats row — 2x2 grid on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="!" label="P1 Tasks">
          <p className="text-2xl font-bold text-p1">{p1Count} <span className="text-sm font-normal text-secondary">Remaining</span></p>
        </StatCard>

        <StatCard icon="⏱" label="Hours">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-primary">{scheduledHours}h</span>
            <span className="text-xs text-secondary">/ {capHours}h</span>
          </div>
          <ProgressBar value={scheduledHours} max={capHours} />
        </StatCard>

        <StatCard icon="✓" label="Habits">
          <p className="text-2xl font-bold text-primary">
            {habitsDoneToday} <span className="text-sm font-normal text-secondary">/ {activeHabits.length}</span>
          </p>
          <ProgressBar value={habitsDoneToday} max={activeHabits.length} />
        </StatCard>

        <StatCard icon="⏰" label="Next Event">
          {nextEvent ? (
            <>
              <p className="text-sm font-medium text-primary truncate">{nextEvent.title}</p>
              <p className="text-xs text-secondary">{formatTimeShort(nextEvent.time)}</p>
            </>
          ) : (
            <p className="text-sm text-tertiary">Nothing scheduled</p>
          )}
        </StatCard>
      </div>

      {/* Quick add */}
      <QuickAddInput
        placeholder="+ Add a task, habit, or event…"
        onSubmit={handleQuickAdd}
      />

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Schedule */}
        <div className="flex-[2] space-y-4">
          <h2 className="text-lg font-medium text-primary flex items-center gap-2">
            📋 Today&apos;s Schedule
          </h2>

          {todayTasks.length === 0 && recurringToday.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CalendarCheck className="w-8 h-8 text-tertiary mx-auto" />
              <p className="text-tertiary text-sm">No tasks scheduled for today</p>
              <p className="text-tertiary text-xs">Use quick-add above to plan your day.</p>
            </div>
          ) : (
            <>
              {/* Scheduled tasks */}
              <div className="space-y-3">
                {todayTasks.map(task => (
                  <div key={task.id} className="space-y-0">
                    {task.scheduledTime && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-secondary">
                          {formatTimeShort(task.scheduledTime)}
                          {' - '}
                          {formatTimeShort(addTime(task.scheduledTime, task.durationMinutes))}
                        </span>
                        {task.priority === 1 && (
                          <span className="text-xs font-semibold text-p1">| P1</span>
                        )}
                      </div>
                    )}
                    <TaskBlock
                      title={task.title}
                      category={task.category}
                      priority={task.priority}
                      durationMinutes={task.durationMinutes}
                      scheduledTime={task.scheduledTime ?? undefined}
                      status={task.status}
                      onClick={() => setActiveTaskId(task.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Recurring */}
              {recurringToday.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Recurring Evening
                  </h3>
                  {recurringToday.map(r => (
                    <div key={r.id}>
                      {r.scheduledTime && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-secondary">
                            {formatTimeShort(r.scheduledTime)}
                            {' - '}
                            {formatTimeShort(addTime(r.scheduledTime, r.durationMinutes))}
                          </span>
                        </div>
                      )}
                      <TaskBlock
                        title={r.title}
                        category={r.category}
                        priority={r.priority ?? 2}
                        durationMinutes={r.durationMinutes}
                        scheduledTime={r.scheduledTime ?? undefined}
                        status="backlog"
                        isRecurring
                        onClick={() => {}}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: Habits */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary flex items-center gap-2">
              ✨ Habits Tracker
            </h2>
          </div>

          {habitsBySection.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="w-6 h-6 text-tertiary mx-auto" />
              <p className="text-sm text-tertiary">No habits yet</p>
              <p className="text-xs text-tertiary">Add some in Settings to start tracking.</p>
            </div>
          ) : (
            <>
              {/* Mobile: 2-col tappable pill grid */}
              <div className="grid grid-cols-2 gap-2 md:hidden">
                {activeHabits.map(habit => {
                  const done = completionsMap.has(`${habit.id}:${today}`);
                  return (
                    <button
                      key={habit.id}
                      onClick={() => handleHabitToggle(habit.id, today, done)}
                      className={`
                        flex items-center justify-between px-3 py-3 rounded-xl border transition-colors
                        ${done
                          ? 'bg-accent/10 border-accent text-primary'
                          : 'bg-surface border-border text-primary'
                        }
                      `}
                    >
                      <span className="text-sm font-medium truncate">{habit.name}</span>
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2
                        ${done ? 'bg-accent text-white' : 'border-2 border-border'}
                      `}>
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop: section-grouped rows */}
              <div className="hidden md:block space-y-4">
                {habitsBySection.map(({ section, habits }) => (
                  <div
                    key={section}
                    className="bg-surface border border-border rounded-lg p-4 space-y-1"
                  >
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide border-b border-border pb-2 mb-2">
                      {SECTION_LABELS[section]}
                    </h3>
                    {habits.map(habit => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        week={week}
                        todayStr={today}
                        completionsMap={completionsMap}
                        onToggle={handleHabitToggle}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
