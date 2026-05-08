import { useState } from 'react';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, CATEGORY_LABELS } from '../../types/personalOS';
import HabitsTracker from './HabitsTracker';
import TaskModal from './TaskModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayDow(): number {
  return new Date().getDay();
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { border: string; bg: string }> = {
  1: { border: '#EF4444', bg: '#FEF2F2' },
  2: { border: '#F59E0B', bg: '#FFFBEB' },
  3: { border: '#10B981', bg: '#ECFDF5' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-blue-50 text-blue-600',
  lms:      'bg-green-50 text-green-600',
  freelance:'bg-yellow-50 text-yellow-700',
  learning: 'bg-purple-50 text-purple-600',
  uber:     'bg-orange-50 text-orange-600',
  faith:    'bg-pink-50 text-pink-600',
};

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const { setActiveTask } = usePersonalOS();
  const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3];
  const catCls = CATEGORY_BADGE[task.category] ?? 'bg-gray-50 text-gray-500';

  return (
    <div
      onClick={() => setActiveTask(task.id)}
      className="flex items-center gap-3 p-3 rounded-xl border-l-2 border border-gray-100 cursor-pointer hover:shadow-sm transition-all mb-2 shadow-xs"
      style={{ background: ps.bg, borderLeftColor: ps.border }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{task.title}</p>
          {task.priority === 1 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
              style={{ background: '#EF4444', color: '#fff' }}>
              URGENT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
            {CATEGORY_LABELS[task.category]}
          </span>
          {task.scheduled_time && (
            <span className="text-[10px]" style={{ color: '#6B7280' }}>{task.scheduled_time.slice(0, 5)}</span>
          )}
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{task.duration_minutes}m</span>
        </div>
      </div>
    </div>
  );
}

// ─── TodayView ────────────────────────────────────────────────────────────────

export default function TodayView() {
  const { tasks, recurringTasks, habits, toggleHabit } = usePersonalOS();
  const today = getToday();
  const todayDow = getTodayDow();
  const [modalOpen, setModalOpen] = useState(false);

  const todayTasks = tasks
    .filter(t => t.assigned_day === today && t.status !== 'done')
    .sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return a.priority - b.priority;
    });

  const activeUberTasks = recurringTasks.filter(
    r => r.active && r.category === 'uber' && r.days_of_week.includes(todayDow)
  );

  const activeHabits = habits.filter(h => h.active);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-2xl font-bold" style={{ color: '#111827' }}>{getGreeting()}</p>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{formatDate(today)}</p>
      </div>

      {/* Add task for today */}
      <button
        onClick={() => setModalOpen(true)}
        className="mb-6 w-full flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors"
        style={{ borderColor: '#E5E7EB', color: '#9CA3AF' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF4444';
          (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
          (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF';
        }}
      >
        <span className="text-lg leading-none">+</span>
        Add a task for today
      </button>

      {/* Today's tasks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Today's tasks</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            {todayTasks.length}
          </span>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>Nothing scheduled for today — add a task above</p>
        ) : (
          todayTasks.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </div>

      {/* Recurring */}
      {activeUberTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Recurring</h2>
          {activeUberTasks.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-xl border-l-2 border border-orange-100 mb-2"
              style={{ background: '#FFF7ED', borderLeftColor: '#F97316' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#EA580C' }}>{r.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                  {r.scheduled_time ? r.scheduled_time.slice(0, 5) : '9–11pm'} · recurring
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Habits today */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Habits today</h2>
        <div className="rounded-xl border p-3 space-y-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          {activeHabits.length === 0 && (
            <p className="text-sm text-center py-2" style={{ color: '#9CA3AF' }}>No habits configured</p>
          )}
          {activeHabits.sort((a, b) => a.sort_order - b.sort_order).map(habit => {
            const done = habit.completions.includes(today);
            return (
              <div key={habit.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleHabit(habit.id, today)}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all shrink-0"
                  style={{
                    background: done ? '#10B981' : 'transparent',
                    borderColor: done ? '#10B981' : '#D1D5DB',
                    color: '#fff',
                  }}
                >
                  {done ? '✓' : ''}
                </button>
                <span
                  className="text-sm flex-1"
                  style={{
                    color: done ? '#9CA3AF' : '#111827',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {habit.name}
                </span>
                <span className="text-[10px] capitalize" style={{ color: '#9CA3AF' }}>{habit.time_of_day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week grid */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Week grid</h2>
        <div className="rounded-xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <HabitsTracker />
        </div>
      </div>

      {/* Task modal */}
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDay={today}
        defaultStatus="in_progress"
      />
    </div>
  );
}
