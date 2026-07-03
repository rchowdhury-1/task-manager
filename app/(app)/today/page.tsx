'use client';
import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  useToday,
  useMe,
  useCategories,
  useCreateTask,
  useCompleteHabit,
  useUncompleteHabit,
  useCompletions,
} from '@/lib/api/hooks';
import { WelcomeHint } from '@/components/WelcomeHint';
import { useActiveTask } from '@/lib/state/activeTask';
import { QuickAddInput, type ParsedTask } from '@/components/QuickAddInput';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StatCell } from '@/components/StatCell';
import { ScheduleRow } from '@/components/ScheduleRow';
import { HabitRowDesktop, HabitCellMobile, StreakCallout } from '@/components/HabitRow';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import { CalendarCheck, Sparkles } from 'lucide-react';
import {
  todayISO,
  greeting,
  longDate,
  formatTimeShort,
  addTime,
  weekDays,
} from '@/lib/utils/dates';
import type { Section } from '@/lib/types';

const SECTION_ORDER: Section[] = ['faith', 'body', 'growth'];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-[1180px] mx-auto space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-36 bg-surface-raised rounded" />
        <div className="h-12 w-80 bg-surface-raised rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-surface-raised rounded-lg" />
        ))}
      </div>
      <div className="h-12 bg-surface-raised rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 bg-surface-raised rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="h-16 bg-surface-raised rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TodayPage() {
  useEffect(() => { document.title = 'Today \u00b7 Personal OS'; }, []);

  const today = todayISO();
  const week = useMemo(() => weekDays(today), [today]);
  const mondayStr = week[0];
  const sundayStr = week[6];

  const { data: me } = useMe();
  const { data: categories } = useCategories();
  const { data, isLoading, error, refetch } = useToday(today);
  const { data: weekCompletions } = useCompletions(mondayStr, sundayStr);
  const createTask = useCreateTask();
  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();
  const { setActiveTaskId } = useActiveTask();

  // Build completions lookup: "habitId:date" → true
  const completionsMap = useMemo(() => {
    const set = new Set<string>();
    data?.completions?.forEach(c => set.add(`${c.habit_id}:${c.date}`));
    weekCompletions?.forEach(c => set.add(`${c.habit_id}:${c.date}`));
    return set;
  }, [data?.completions, weekCompletions]);

  const handleQuickAdd = (parsed: ParsedTask) => {
    const defaultCategory = categories?.[0]?.slug;
    if (!parsed.category && !defaultCategory) {
      toast.error('Create a topic first (Lists → New topic).');
      return;
    }
    createTask.mutate(
      {
        title: parsed.title,
        category: parsed.category ?? defaultCategory!,
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
    // scheduledTime may be HH:MM or HH:MM:SS — normalise before comparing
    .filter(e => e.time.slice(0, 5) > nowTime)
    .sort((a, b) => a.time.localeCompare(b.time));

  const nextEvent = allScheduled[0];

  // Group habits by section
  const habitsBySection = SECTION_ORDER
    .map(s => ({
      section: s,
      habits: activeHabits.filter(h => h.section === s),
    }))
    .filter(g => g.habits.length > 0);

  // Max streak across all habits
  const maxStreak = activeHabits.reduce((best, habit) => {
    let streak = 0;
    const todayIdx = week.indexOf(today);
    for (let i = todayIdx; i >= 0; i--) {
      if (completionsMap.has(`${habit.id}:${week[i]}`)) streak++;
      else break;
    }
    return Math.max(best, streak);
  }, 0);

  const name = me?.name?.split(' ')[0] ?? '';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="max-w-[1180px] mx-auto space-y-8 md:space-y-10"
    >
      {/* ── Editorial Greeting ────────────────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-secondary mb-2">
          {longDate()}
        </p>
        <h1 className="text-[32px] md:text-[52px] font-semibold leading-[1.02] tracking-display text-primary">
          {greeting()}{name ? <>, <em className="font-display italic text-accent not-italic">{name}.</em></> : '.'}
        </h1>
      </motion.div>

      {/* ── First-run welcome hint ────────────────────────────────────── */}
      <WelcomeHint />

      {/* ── Stat Rundown ──────────────────────────────────────────────── */}
      <motion.div
        variants={staggerChildren}
        className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3"
      >
        <motion.div variants={fadeInUp}>
          <StatCell
            label="P1 Tasks"
            value={p1Count}
            accentBorder
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCell
            label="Hours"
            value={<>{scheduledHours}<span className="text-[14px] font-normal text-secondary">h / {capHours}h</span></>}
            progress={{ value: scheduledHours, max: capHours }}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCell
            label="Habits"
            value={<>{habitsDoneToday}<span className="text-[14px] font-normal text-secondary"> / {activeHabits.length}</span></>}
            progress={{ value: habitsDoneToday, max: activeHabits.length }}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCell
            label="Next Up"
            value={
              nextEvent ? (
                <div className="flex flex-col">
                  <span className="text-[15px] md:text-[16px] font-medium truncate">{nextEvent.title}</span>
                  <span className="text-[12px] text-secondary font-mono">{formatTimeShort(nextEvent.time)}</span>
                </div>
              ) : (
                <span className="text-[15px] text-tertiary">Clear</span>
              )
            }
          />
        </motion.div>
      </motion.div>

      {/* ── Quick Add ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <QuickAddInput
          placeholder={'+ Add a task, habit, or event\u2026'}
          onSubmit={handleQuickAdd}
        />
      </motion.div>

      {/* ── Two-column: Schedule + Habits ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 md:gap-12">
        {/* ── Schedule Column ──────────────────────────────────────── */}
        <motion.div variants={staggerChildren} className="space-y-3">
          <motion.h2
            variants={fadeInUp}
            className="font-mono text-[11px] tracking-[0.12em] uppercase text-secondary mb-2"
          >
            Schedule
          </motion.h2>

          {todayTasks.length === 0 && recurringToday.length === 0 ? (
            <motion.div variants={fadeInUp} className="text-center py-16 space-y-3">
              <CalendarCheck className="w-8 h-8 text-tertiary mx-auto" />
              <p className="text-tertiary text-sm">No tasks scheduled for today</p>
              <p className="text-tertiary text-xs">Use quick-add above to plan your day.</p>
            </motion.div>
          ) : (
            <>
              {todayTasks.map(task => (
                <motion.div key={task.id} variants={fadeInUp}>
                  <ScheduleRow
                    title={task.title}
                    category={task.category}
                    scheduledTime={task.scheduledTime}
                    durationMinutes={task.durationMinutes}
                    status={task.status}
                    priority={task.priority}
                    onClick={() => setActiveTaskId(task.id)}
                  />
                </motion.div>
              ))}

              {/* Recurring / Evening */}
              {recurringToday.length > 0 && (
                <div className="pt-4 mt-4 border-t border-dashed border-border-strong space-y-3">
                  <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-secondary">
                    Recurring &middot; Evening
                  </p>
                  {recurringToday.map(r => (
                    <motion.div key={r.id} variants={fadeInUp}>
                      <ScheduleRow
                        title={r.title}
                        category={r.category}
                        scheduledTime={r.scheduledTime}
                        durationMinutes={r.durationMinutes}
                        priority={r.priority}
                        isRecurring
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* ── Habits Column ────────────────────────────────────────── */}
        <motion.aside
          variants={fadeInUp}
          className="bg-surface border border-border rounded-xl p-5 md:p-6"
        >
          <h2 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-secondary mb-4">
            Habits
          </h2>

          {habitsBySection.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Sparkles className="w-6 h-6 text-tertiary mx-auto" />
              <p className="text-sm text-tertiary">No habits yet</p>
              <p className="text-xs text-tertiary">Add some in Settings to start tracking.</p>
            </div>
          ) : (
            <>
              {/* Mobile: 2-col pill grid */}
              <div className="grid grid-cols-2 gap-2 md:hidden">
                {activeHabits.map(habit => (
                  <HabitCellMobile
                    key={habit.id}
                    habit={habit}
                    todayStr={today}
                    done={completionsMap.has(`${habit.id}:${today}`)}
                    onToggle={handleHabitToggle}
                  />
                ))}
              </div>

              {/* Desktop: section-grouped rows */}
              <div className="hidden md:block space-y-4">
                {habitsBySection.map(({ section, habits }) => (
                  <motion.div
                    key={section}
                    variants={fadeInUp}
                    className="space-y-0.5"
                  >
                    {habits.map(habit => (
                      <HabitRowDesktop
                        key={habit.id}
                        habit={habit}
                        week={week}
                        todayStr={today}
                        completionsMap={completionsMap}
                        onToggle={handleHabitToggle}
                      />
                    ))}
                  </motion.div>
                ))}
              </div>

              {/* Streak callout */}
              <div className="mt-4">
                <StreakCallout streak={maxStreak} />
              </div>
            </>
          )}
        </motion.aside>
      </div>
    </motion.div>
    </ErrorBoundary>
  );
}
