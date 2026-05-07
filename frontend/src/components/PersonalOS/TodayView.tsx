import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import {
  Task, PRIORITY_COLORS, CATEGORY_COLORS, CATEGORY_LABELS,
} from '../../types/personalOS';

const CAT_COLORS_HABIT: Record<string, string> = { faith: '#a855f7', body: '#10b981', growth: '#3b82f6' };

function TodayTask({ task }: { task: Task }) {
  const { setActiveTask } = usePersonalOS();
  const priColor = PRIORITY_COLORS[task.priority];
  const catColor = CATEGORY_COLORS[task.category];

  return (
    <div
      onClick={() => setActiveTask(task.id)}
      className="flex items-center gap-3 p-3 rounded-xl border mb-2 cursor-pointer hover:border-opacity-60 transition-all"
      style={{ background: 'var(--surface)', borderColor: priColor + '33', borderLeftWidth: '3px', borderLeftColor: priColor }}
    >
      {task.scheduled_time && (
        <span className="text-sm font-mono shrink-0 w-12 text-right" style={{ color: 'var(--text-muted)' }}>
          {task.scheduled_time.slice(0, 5)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: priColor }}>P{task.priority}</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: catColor + '22', color: catColor }}>
            {CATEGORY_LABELS[task.category]}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.duration_minutes}min</span>
        </div>
      </div>
    </div>
  );
}

export default function TodayView() {
  const { tasks, habits, recurringTasks, toggleHabit, refetch } = usePersonalOS();
  const today = new Date().toISOString().split('T')[0];
  const [addTitle, setAddTitle] = useState('');
  const [addCategory, setAddCategory] = useState<Task['category']>('career');
  const [adding, setAdding] = useState(false);

  const todayTasks = tasks
    .filter((t) => t.assigned_day === today && t.status !== 'done')
    .sort((a, b) => (a.scheduled_time || '99:99').localeCompare(b.scheduled_time || '99:99') || a.priority - b.priority);

  const activeUber = recurringTasks.filter((r) => {
    if (!r.active || r.category !== 'uber') return false;
    const dow = new Date(today).getDay();
    return r.days_of_week.includes(dow);
  });

  const todayHabits = habits.filter((h) => h.active);

  const handleAddTask = async () => {
    if (!addTitle.trim()) return;
    setAdding(true);
    try {
      await api.post('/tasks', {
        title: addTitle.trim(),
        category: addCategory,
        assigned_day: today,
        status: 'in_progress',
        priority: 2,
      });
      await refetch();
      setAddTitle('');
      toast.success('Task added');
    } catch {
      toast.error('Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Today</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <span
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--primary)' }}
        >
          {todayTasks.length} tasks
        </span>
      </div>

      {/* Quick add */}
      <div className="flex gap-2 mb-6">
        <input
          value={addTitle}
          onChange={(e) => setAddTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="Quick-add a task for today…"
          className="flex-1 rounded-xl px-4 py-2 text-sm border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        <select
          value={addCategory}
          onChange={(e) => setAddCategory(e.target.value as Task['category'])}
          className="rounded-xl px-3 py-2 text-sm border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {(['career','lms','freelance','learning','faith'] as Task['category'][]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button
          onClick={handleAddTask}
          disabled={adding || !addTitle.trim()}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          Add
        </button>
      </div>

      {/* Tasks */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Tasks</h3>
        {todayTasks.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            No tasks scheduled for today — great, or add some above!
          </p>
        )}
        {todayTasks.map((t) => <TodayTask key={t.id} task={t} />)}
      </section>

      {/* Uber Eats block — always last */}
      {activeUber.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Tonight</h3>
          {activeUber.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 rounded-xl border mb-2"
              style={{ background: 'rgba(236,72,153,0.08)', borderColor: 'rgba(236,72,153,0.3)', borderLeftWidth: '3px', borderLeftColor: '#ec4899' }}
            >
              <span className="text-sm font-mono shrink-0 w-12 text-right" style={{ color: '#ec4899' }}>
                {u.scheduled_time?.slice(0, 5)}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>🛵 {u.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.duration_minutes}min</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Habit checklist */}
      <section>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Habits</h3>
        <div className="rounded-xl border px-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {todayHabits.map((h) => {
            const done = h.completions.includes(today);
            const catColor = CAT_COLORS_HABIT[h.category] || '#94a3b8';
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 py-3 border-b last:border-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => toggleHabit(h.id, today)}
                  className="w-5 h-5 rounded-full border flex items-center justify-center transition-all"
                  style={{
                    borderColor: done ? catColor : 'var(--border)',
                    background: done ? catColor : 'transparent',
                  }}
                >
                  {done && <span className="text-white text-xs">✓</span>}
                </button>
                <span className="text-sm" style={{ color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                  {h.name}
                </span>
                {h.duration_minutes > 0 && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                    {h.duration_minutes}min
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
