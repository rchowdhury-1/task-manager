import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, CATEGORY_LABELS } from '../../types/personalOS';
import HabitsTracker from './HabitsTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayDow(): number {
  return new Date().getDay(); // 0=Sun
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
  1: { border: '#E24B4A', bg: '#2D1F1F' },
  2: { border: '#EF9F27', bg: '#2D2419' },
  3: { border: '#639922', bg: '#1E2A14' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-[#1A2F4A] text-[#60A5FA]',
  lms:      'bg-[#1A3A1A] text-[#4ADE80]',
  freelance:'bg-[#3A2A0A] text-[#FCD34D]',
  learning: 'bg-[#2A1A3A] text-[#C084FC]',
  uber:     'bg-[#3A1A0A] text-[#FB923C]',
  faith:    'bg-[#2A1A2A] text-[#F472B6]',
};

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const { setActiveTask } = usePersonalOS();
  const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3];
  const catCls = CATEGORY_BADGE[task.category] ?? 'bg-[#2A2A2A] text-[#98989F]';

  return (
    <div
      onClick={() => setActiveTask(task.id)}
      className="flex items-center gap-3 p-3 rounded-xl border-l-2 cursor-pointer hover:opacity-80 transition-opacity mb-2"
      style={{ background: ps.bg, borderLeftColor: ps.border }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F5F5F7] truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
            {CATEGORY_LABELS[task.category]}
          </span>
          {task.scheduled_time && (
            <span className="text-[10px] text-[#98989F]">{task.scheduled_time.slice(0, 5)}</span>
          )}
          <span className="text-[10px] text-[#98989F]">{task.duration_minutes}m</span>
        </div>
      </div>
    </div>
  );
}

// ─── TodayView ────────────────────────────────────────────────────────────────

export default function TodayView() {
  const { tasks, recurringTasks, habits, refetch, toggleHabit } = usePersonalOS();
  const today = getToday();
  const todayDow = getTodayDow();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Task['category']>('career');
  const [addingTask, setAddingTask] = useState(false);

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

  const handleAddTask = async () => {
    if (!title.trim()) return;
    try {
      await api.post('/tasks', {
        title: title.trim(),
        category,
        assigned_day: today,
        status: 'in_progress',
        priority: 2,
        duration_minutes: 60,
      });
      await refetch();
      setTitle('');
      setAddingTask(false);
    } catch {
      toast.error('Failed to add task', {
        style: { background: '#2C2C2E', color: '#F5F5F7', border: '1px solid #E24B4A' },
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-2xl font-semibold text-[#F5F5F7]">{getGreeting()}</p>
        <p className="text-sm text-[#98989F] mt-0.5">{formatDate(today)}</p>
      </div>

      {/* Quick-add bar */}
      <div className="mb-6 bg-[#2C2C2E] rounded-xl border border-[#48484A] p-3">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setAddingTask(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') { setTitle(''); setAddingTask(false); }
            }}
            placeholder="Add a task for today…"
            className="flex-1 bg-transparent text-sm text-[#F5F5F7] placeholder-[#98989F] outline-none"
          />
          {addingTask && (
            <>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Task['category'])}
                className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded-lg px-2 py-1.5 text-[#F5F5F7] outline-none"
              >
                {(['career','lms','freelance','learning','uber','faith'] as Task['category'][]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <button
                onClick={handleAddTask}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#C084FC] text-black font-medium"
              >
                Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* Today's tasks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[#F5F5F7]">Today's tasks</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#3A3A3C] text-[#98989F]">
            {todayTasks.length}
          </span>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-[#98989F] py-4 text-center">Nothing scheduled for today — add a task above</p>
        ) : (
          todayTasks.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </div>

      {/* Recurring / Uber */}
      {activeUberTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#98989F] uppercase tracking-widest text-xs mb-3">Recurring</h2>
          {activeUberTasks.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-xl border-l-2 mb-2"
              style={{ background: '#3A1A0A', borderLeftColor: '#D85A30' }}
            >
              <div>
                <p className="text-sm font-medium text-[#FB923C]">{r.title}</p>
                <p className="text-[10px] text-[#98989F] mt-0.5">
                  {r.scheduled_time ? r.scheduled_time.slice(0, 5) : '9–11pm'} · every night
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Habits — today only */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#98989F] uppercase tracking-widest text-xs mb-3">Habits today</h2>
        <div className="bg-[#2C2C2E] rounded-xl border border-[#48484A] p-3 space-y-2">
          {activeHabits.length === 0 && (
            <p className="text-sm text-[#98989F] text-center py-2">No habits configured</p>
          )}
          {activeHabits.sort((a, b) => a.sort_order - b.sort_order).map(habit => {
            const done = habit.completions.includes(today);
            return (
              <div key={habit.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleHabit(habit.id, today)}
                  className="w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold transition-all shrink-0"
                  style={{
                    background: done ? '#1D9E75' : 'transparent',
                    borderColor: done ? '#1D9E75' : '#48484A',
                    color: '#fff',
                  }}
                >
                  {done ? '✓' : ''}
                </button>
                <span
                  className="text-sm flex-1"
                  style={{
                    color: done ? '#98989F' : '#F5F5F7',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {habit.name}
                </span>
                <span className="text-[10px] text-[#98989F] capitalize">{habit.time_of_day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full habits grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#98989F] uppercase tracking-widest text-xs mb-3">Week grid</h2>
        <div className="bg-[#2C2C2E] rounded-xl border border-[#48484A] overflow-hidden">
          <HabitsTracker />
        </div>
      </div>
    </div>
  );
}
