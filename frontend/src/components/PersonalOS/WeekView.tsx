import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, DayRule, RecurringTask, FOCUS_LABELS, CATEGORY_LABELS } from '../../types/personalOS';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function dateToDbDow(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${m.toString().padStart(2, '0')}${suffix}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { border: string; bg: string; text: string }> = {
  1: { border: '#E24B4A', bg: '#2D1F1F', text: '#FF6B6B' },
  2: { border: '#EF9F27', bg: '#2D2419', text: '#FFC068' },
  3: { border: '#639922', bg: '#1E2A14', text: '#8DC642' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-[#1A2F4A] text-[#60A5FA]',
  lms:      'bg-[#1A3A1A] text-[#4ADE80]',
  freelance:'bg-[#3A2A0A] text-[#FCD34D]',
  learning: 'bg-[#2A1A3A] text-[#C084FC]',
  uber:     'bg-[#3A1A0A] text-[#FB923C]',
  faith:    'bg-[#2A1A2A] text-[#F472B6]',
};

const FOCUS_BADGE: Record<string, string> = {
  job_hunt: 'bg-[#1A2F4A] text-[#60A5FA]',
  lms:      'bg-[#1A3A1A] text-[#4ADE80]',
  freelance:'bg-[#3A2A0A] text-[#FCD34D]',
  learning: 'bg-[#2A1A3A] text-[#C084FC]',
  rest:     'bg-[#2A2A2A] text-[#98989F]',
  flex:     'bg-[#1A2A3A] text-[#67E8F9]',
};

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── TaskPill ─────────────────────────────────────────────────────────────────

function TaskPill({ task }: { task: Task }) {
  const { setActiveTask } = usePersonalOS();
  const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3];
  const catCls = CATEGORY_BADGE[task.category] ?? 'bg-[#2A2A2A] text-[#98989F]';

  return (
    <div
      onClick={() => setActiveTask(task.id)}
      className="rounded-md p-2 mb-2 border-l-2 cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: ps.bg, borderLeftColor: ps.border, opacity: task.status === 'done' ? 0.4 : 1 }}
    >
      <p className="text-xs font-medium text-[#F5F5F7] leading-snug line-clamp-2" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</p>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
          {CATEGORY_LABELS[task.category]}
        </span>
        <span className="text-[10px] text-[#98989F]">{formatMinutes(task.duration_minutes)}</span>
      </div>
    </div>
  );
}

// ─── UberPill ─────────────────────────────────────────────────────────────────

function UberPill({ time }: { time: string }) {
  return (
    <div
      className="rounded-md p-2 border-l-2 mt-auto"
      style={{ background: '#3A1A0A', borderLeftColor: '#D85A30' }}
    >
      <p className="text-xs font-medium text-[#FB923C]">Uber Eats · {formatTime(time)}</p>
    </div>
  );
}

// ─── HoursBar ─────────────────────────────────────────────────────────────────

function HoursBar({ tasks, dayRule }: { tasks: Task[]; dayRule: DayRule | undefined }) {
  if (!dayRule) return null;
  const logged = tasks.reduce((s, t) => s + t.time_logged_minutes, 0);
  const maxMinutes = dayRule.max_focus_hours * 60;
  const pct = maxMinutes > 0 ? Math.min(100, Math.round((logged / maxMinutes) * 100)) : 0;
  const isWarn = pct >= 75;

  return (
    <div className="mt-auto pt-2">
      <div className="flex justify-between text-[10px] text-[#98989F] mb-1">
        <span>{formatMinutes(logged)}</span>
        <span>{dayRule.max_focus_hours}h</span>
      </div>
      <div className="h-1 rounded-full bg-[#48484A] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: isWarn ? '#EF9F27' : '#60A5FA' }}
        />
      </div>
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

function DayColumn({
  dateStr, dayIndex, tasks, dayRule, recurringTasks, today,
}: {
  dateStr: string;
  dayIndex: number;
  tasks: Task[];
  dayRule: DayRule | undefined;
  recurringTasks: RecurringTask[];
  today: string;
}) {
  const isToday = dateStr === today;
  const dow = dateToDbDow(dateStr); // 0=Sun
  const dateNum = parseInt(dateStr.split('-')[2], 10);

  const focusBadgeCls = dayRule
    ? (FOCUS_BADGE[dayRule.focus_area] ?? 'bg-[#2A2A2A] text-[#98989F]')
    : 'bg-[#2A2A2A] text-[#98989F]';
  const focusLabel = dayRule ? (FOCUS_LABELS[dayRule.focus_area] ?? dayRule.focus_area) : '—';

  const uberTask = recurringTasks.find(
    r => r.active && r.category === 'uber' && r.days_of_week.includes(dow)
  );
  const uberTime = uberTask?.scheduled_time
    ? uberTask.scheduled_time.slice(0, 5)
    : '21:00';

  const dayTasks = tasks
    .filter(t => t.assigned_day === dateStr)
    .sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return a.priority - b.priority;
    });

  return (
    <div
      className="flex flex-col rounded-xl p-3 min-h-[300px] min-w-[160px] flex-1"
      style={{
        background: '#2C2C2E',
        border: isToday ? '2px solid #60A5FA' : '2px solid transparent',
      }}
    >
      {/* Header */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-widest text-[#98989F] font-medium mb-0.5">
          {DAY_SHORT[dayIndex]}
        </p>
        <p className="text-2xl font-medium" style={{ color: isToday ? '#60A5FA' : '#F5F5F7' }}>
          {dateNum}
        </p>
        {dayRule && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${focusBadgeCls}`}>
            {focusLabel}
          </span>
        )}
      </div>

      {/* Task pills */}
      <div className="flex-1 overflow-y-auto">
        {dayTasks.map(task => <TaskPill key={task.id} task={task} />)}
      </div>

      {/* Hours bar */}
      <HoursBar tasks={dayTasks} dayRule={dayRule} />

      {/* Uber pill */}
      {uberTask && (
        <div className="mt-2">
          <UberPill time={uberTime} />
        </div>
      )}
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

export default function WeekView() {
  const { tasks, recurringTasks, dayRules } = usePersonalOS();
  const weekDates = getWeekDates();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-3 p-4 overflow-x-auto min-h-full">
      {weekDates.map((dateStr, i) => {
        const dow = dateToDbDow(dateStr); // 0=Sun
        const dayRule = dayRules.find(r => r.day_of_week === dow);
        return (
          <DayColumn
            key={dateStr}
            dateStr={dateStr}
            dayIndex={i}
            tasks={tasks}
            dayRule={dayRule}
            recurringTasks={recurringTasks}
            today={today}
          />
        );
      })}
    </div>
  );
}
