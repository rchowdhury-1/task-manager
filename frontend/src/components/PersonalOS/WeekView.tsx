import { usePersonalOS } from '../../contexts/PersonalOSContext';
import {
  Task, DayRule, RecurringTask,
  FOCUS_LABELS, FOCUS_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, CATEGORY_LABELS,
  DAY_NAMES_LONG,
} from '../../types/personalOS';

const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  // Find this week's Monday
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Mon=0 in weekDates array, but day_of_week in DB is Sun=0
const dateToDbDow = (date: string): number => new Date(date).getDay();

function HoursBar({ logged, max }: { logged: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (logged / max) * 100) : 0;
  const color = pct >= 75 ? '#f59e0b' : 'var(--primary)';
  return (
    <div className="w-full h-1 rounded-full mt-1" style={{ background: 'var(--bg-2)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function TaskPill({ task }: { task: Task }) {
  const { setActiveTask } = usePersonalOS();
  const priColor = PRIORITY_COLORS[task.priority];
  return (
    <button
      onClick={() => setActiveTask(task.id)}
      className="w-full text-left px-2 py-1 rounded text-xs border-l-2 mb-1 hover:opacity-80 transition-opacity truncate"
      style={{
        background: 'var(--bg)',
        borderLeftColor: priColor,
        color: 'var(--text)',
        maxWidth: '100%',
      }}
      title={task.title}
    >
      <span className="font-medium mr-1" style={{ color: priColor }}>P{task.priority}</span>
      {task.title}
    </button>
  );
}

function UberPill({ task }: { task: RecurringTask }) {
  return (
    <div
      className="mt-auto px-2 py-1 rounded text-xs border-l-2"
      style={{ background: 'rgba(236,72,153,0.1)', borderLeftColor: '#ec4899', color: '#ec4899' }}
    >
      🛵 {task.title} {task.scheduled_time}
    </div>
  );
}

function DayColumn({
  date, dayRule, tasks, uberTasks,
}: {
  date: string;
  dayRule: DayRule | undefined;
  tasks: Task[];
  uberTasks: RecurringTask[];
}) {
  const dow = dateToDbDow(date);
  const isToday = date === new Date().toISOString().split('T')[0];
  const focusColor = dayRule ? FOCUS_COLORS[dayRule.focus_area] || '#94a3b8' : '#94a3b8';
  const focusLabel = dayRule ? FOCUS_LABELS[dayRule.focus_area] || dayRule.focus_area : '—';
  const maxH = dayRule ? dayRule.max_focus_hours : 8;
  const loggedH = tasks.reduce((sum, t) => sum + (t.time_logged_minutes || 0) / 60, 0);

  const dayLabel = DAY_NAMES_LONG[(dow + 7) % 7].slice(0, 3);
  const dayNum = new Date(date).getDate();

  const todayUber = uberTasks.filter((r) => r.active && r.days_of_week.includes(dow));

  return (
    <div
      className="flex flex-col min-w-40 rounded-xl p-3 border"
      style={{
        background: isToday ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
        borderColor: isToday ? 'rgba(16,185,129,0.4)' : 'var(--border)',
        minHeight: '300px',
      }}
    >
      {/* Day header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: isToday ? 'var(--primary)' : 'var(--text)' }}>
            {dayLabel} {dayNum}
          </span>
          {isToday && (
            <span className="text-xs px-1 rounded" style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--primary)' }}>
              Today
            </span>
          )}
        </div>
        {/* Focus badge */}
        <span
          className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: focusColor + '22', color: focusColor }}
        >
          {focusLabel}
        </span>
        {/* Hours bar */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {Math.round(loggedH * 10) / 10}h / {maxH}h
          </span>
        </div>
        <HoursBar logged={loggedH} max={maxH} />
      </div>

      {/* Task pills */}
      <div className="flex-1 flex flex-col">
        {tasks.map((t) => <TaskPill key={t.id} task={t} />)}
        {tasks.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks</p>
        )}
      </div>

      {/* Uber Eats pinned to bottom */}
      {todayUber.map((u) => <UberPill key={u.id} task={u} />)}
    </div>
  );
}

export default function WeekView() {
  const { tasks, dayRules, recurringTasks } = usePersonalOS();
  const weekDates = getWeekDates(); // Mon–Sun

  const uberActive = recurringTasks.filter((r) => r.active && r.category === 'uber');

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Week View</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {weekDates.map((date) => {
          const dow = dateToDbDow(date);
          const dayRule = dayRules.find((dr) => dr.day_of_week === dow);
          const dayTasks = tasks
            .filter((t) => t.assigned_day === date && t.status !== 'done')
            .sort((a, b) => a.priority - b.priority || (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

          return (
            <DayColumn
              key={date}
              date={date}
              dayRule={dayRule}
              tasks={dayTasks}
              uberTasks={uberActive}
            />
          );
        })}
      </div>
    </div>
  );
}
