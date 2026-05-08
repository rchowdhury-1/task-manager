import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import { usePersonalOS } from '../../contexts/PersonalOSContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const TODAY_STR = new Date().toISOString().split('T')[0];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtHours(mins: number): string {
  const h = +(mins / 60).toFixed(1);
  return `${h}h`;
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  const { tasks, habits } = usePersonalOS();

  const doneCount      = tasks.filter(t => t.status === 'done').length;
  const activeHabits   = habits.filter(h => h.active);
  const habitsToday    = activeHabits.filter(h => h.completions.includes(TODAY_STR)).length;
  const totalLoggedMin = tasks.reduce((s, t) => s + (t.time_logged_minutes || 0), 0);
  const p1Open         = tasks.filter(t => t.priority === 1 && t.status !== 'done').length;

  const cards = [
    { label: 'Tasks Done',    value: String(doneCount),                         color: '#10B981', bg: '#ECFDF5' },
    { label: 'Habits Today',  value: `${habitsToday}/${activeHabits.length}`,   color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Hours Logged',  value: fmtHours(totalLoggedMin),                  color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'P1 Open',       value: String(p1Open),                            color: '#EF4444', bg: '#FEF2F2' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, color, bg }) => (
        <div key={label} className="rounded-xl p-4 border" style={{ background: bg, borderColor: '#F3F4F6' }}>
          <p className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#9CA3AF' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Focus Hours Chart ────────────────────────────────────────────────────────

function FocusHoursChart() {
  const { tasks, dayRules } = usePersonalOS();
  const weekDates = getWeekDates();

  const data = weekDates.map((dateStr, i) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun
    const rule = dayRules.find(r => r.day_of_week === dow);
    const targetHours = Number(rule?.max_focus_hours ?? 4);
    const loggedMins  = tasks.filter(t => t.assigned_day === dateStr).reduce((s, t) => s + (t.time_logged_minutes || 0), 0);
    const loggedHours = +(loggedMins / 60).toFixed(1);
    const pct         = targetHours > 0 ? Math.min(100, (loggedHours / targetHours) * 100) : 0;
    const isToday     = dateStr === TODAY_STR;
    return { day: DAY_SHORT[i], loggedHours, targetHours, pct, isToday };
  });

  const maxTarget = Math.max(...data.map(d => d.targetHours), 1);

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Focus Hours — This Week</h2>
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-end gap-2" style={{ height: 96 }}>
          {data.map(({ day, loggedHours, targetHours, pct, isToday }) => {
            const barHeightPct = maxTarget > 0 ? (targetHours / maxTarget) * 100 : 100;
            const barColor = isToday ? '#EF4444' : pct >= 100 ? '#F59E0B' : '#93C5FD';
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                {loggedHours > 0 && (
                  <span className="text-[9px] font-medium" style={{ color: isToday ? '#EF4444' : '#6B7280' }}>
                    {loggedHours}h
                  </span>
                )}
                <div
                  className="w-full relative rounded-t-md overflow-hidden"
                  style={{ height: `${barHeightPct}%`, background: '#F3F4F6' }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-700"
                    style={{ height: `${pct}%`, background: barColor }}
                  />
                </div>
                <span
                  className="text-[9px]"
                  style={{ color: isToday ? '#EF4444' : '#9CA3AF', fontWeight: isToday ? 600 : 400 }}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-200" />
            <span className="text-xs" style={{ color: '#6B7280' }}>Logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#F3F4F6' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span className="text-xs" style={{ color: '#6B7280' }}>Over target</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Habit Grid ───────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  faith:  '#EC4899',
  body:   '#10B981',
  growth: '#8B5CF6',
};

function HabitGrid() {
  const { habits } = usePersonalOS();
  const weekDates    = getWeekDates();
  const activeHabits = habits.filter(h => h.active);
  if (activeHabits.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Habit Completion — This Week</h2>
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        <div className="overflow-x-auto">
          {/* Day header */}
          <div className="flex items-center border-b px-4 py-2" style={{ borderColor: '#F3F4F6', minWidth: 420 }}>
            <div style={{ width: 140, flexShrink: 0 }} />
            {weekDates.map((dateStr, i) => (
              <div key={i} className="flex-1 flex justify-center">
                <span
                  className="text-[9px] uppercase tracking-wide font-semibold"
                  style={{ color: dateStr === TODAY_STR ? '#EF4444' : '#9CA3AF' }}
                >
                  {DAY_SHORT[i]}
                </span>
              </div>
            ))}
            <div style={{ width: 56, flexShrink: 0 }} className="text-right pr-1">
              <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: '#9CA3AF' }}>Streak</span>
            </div>
          </div>

          {activeHabits.map((habit) => {
            const color   = CAT_COLOR[habit.category] || '#6B7280';
            const streak  = habit.streak_days ?? 0;
            return (
              <div
                key={habit.id}
                className="flex items-center px-4 py-2.5 border-b last:border-b-0"
                style={{ borderColor: '#F9FAFB', minWidth: 420 }}
              >
                <div style={{ width: 140, flexShrink: 0 }} className="pr-3">
                  <p className="text-xs font-medium truncate" style={{ color: '#111827' }}>{habit.name}</p>
                  <p className="text-[9px] capitalize mt-0.5" style={{ color: '#9CA3AF' }}>{habit.category}</p>
                </div>
                {weekDates.map((dateStr, i) => {
                  const done   = habit.completions.includes(dateStr);
                  const future = dateStr > TODAY_STR;
                  return (
                    <div key={i} className="flex-1 flex justify-center">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{
                          background: done ? color : '#F3F4F6',
                          opacity: future ? 0.3 : 1,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        {done ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
                <div style={{ width: 56, flexShrink: 0 }} className="text-right pr-1">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: streak > 0 ? '#F59E0B' : '#D1D5DB' }}
                  >
                    {streak > 0 ? `🔥${streak}` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Task Breakdown ───────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { key: 'backlog',      label: 'Backlog',      color: '#D1D5DB' },
  { key: 'this_week',   label: 'This Week',    color: '#3B82F6' },
  { key: 'in_progress', label: 'In Progress',  color: '#F59E0B' },
  { key: 'done',        label: 'Done',         color: '#10B981' },
] as const;

const CATEGORY_CONFIG = [
  { key: 'career',   label: 'Career',   color: '#3B82F6' },
  { key: 'lms',      label: 'LMS',      color: '#10B981' },
  { key: 'freelance',label: 'Freelance',color: '#F59E0B' },
  { key: 'learning', label: 'Learning', color: '#8B5CF6' },
  { key: 'uber',     label: 'Uber',     color: '#F97316' },
  { key: 'faith',    label: 'Faith',    color: '#EC4899' },
] as const;

function BreakdownBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: '#6B7280' }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: '#111827' }}>{count}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TaskBreakdown() {
  const { tasks } = usePersonalOS();

  const statusData   = STATUS_CONFIG.map(c => ({ ...c, count: tasks.filter(t => t.status === c.key).length }));
  const categoryData = CATEGORY_CONFIG.map(c => ({ ...c, count: tasks.filter(t => t.category === c.key).length })).filter(c => c.count > 0);
  const maxStatus    = Math.max(...statusData.map(d => d.count), 1);
  const maxCategory  = Math.max(...categoryData.map(d => d.count), 1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>By Status</h2>
        <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: '#E5E7EB' }}>
          {statusData.map(d => (
            <BreakdownBar key={d.key} label={d.label} count={d.count} max={maxStatus} color={d.color} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>By Category</h2>
        <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: '#E5E7EB' }}>
          {categoryData.length > 0 ? (
            categoryData.map(d => (
              <BreakdownBar key={d.key} label={d.label} count={d.count} max={maxCategory} color={d.color} />
            ))
          ) : (
            <p className="text-sm text-center py-2" style={{ color: '#9CA3AF' }}>No tasks yet</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── StatsPage ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  return (
    <PersonalOSLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold mb-6" style={{ color: '#111827' }}>Stats</h1>
        <SummaryCards />
        <FocusHoursChart />
        <HabitGrid />
        <TaskBreakdown />
      </div>
    </PersonalOSLayout>
  );
}
