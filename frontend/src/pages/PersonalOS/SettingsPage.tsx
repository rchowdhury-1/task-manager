import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { DayRule, Habit, DAY_NAMES_LONG } from '../../types/personalOS';
import api from '../../api/axios';

const TOAST_STYLE = { background: '#2C2C2E', color: '#F5F5F7', border: '1px solid #48484A' };
const ERROR_STYLE = { background: '#2C2C2E', color: '#F5F5F7', border: '1px solid #E24B4A' };

// ─── Day Rules Editor ─────────────────────────────────────────────────────────

type DayDraft = { focus_area: string; max_focus_hours: number };

function DayRulesEditor() {
  const { dayRules, refetch } = usePersonalOS();
  const [drafts, setDrafts] = useState<Record<number, DayDraft>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const init: Record<number, DayDraft> = {};
    for (const rule of dayRules) {
      init[rule.day_of_week] = {
        focus_area: rule.focus_area ?? '',
        max_focus_hours: rule.max_focus_hours ?? 4,
      };
    }
    setDrafts(init);
  }, [dayRules]);

  const handleBlur = async (dayOfWeek: number) => {
    const draft = drafts[dayOfWeek];
    if (!draft) return;
    const rule = dayRules.find((r) => r.day_of_week === dayOfWeek);
    if (rule && rule.focus_area === draft.focus_area && rule.max_focus_hours === draft.max_focus_hours) return;

    setSaving(dayOfWeek);
    try {
      await api.patch(`/day-rules/${dayOfWeek}`, draft);
      await refetch();
      toast.success('Saved', { style: TOAST_STYLE });
    } catch {
      toast.error('Failed to save day rule', { style: ERROR_STYLE });
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-[#F5F5F7] mb-1">Day Rules</h2>
      <p className="text-xs text-[#98989F] mb-4">
        Set the focus area and max working hours for each day. The AI will use these to warn you about schedule conflicts.
      </p>
      <div className="rounded-xl border border-[#48484A] overflow-hidden">
        {DAY_NAMES_LONG.map((dayName, idx) => {
          const draft = drafts[idx] ?? { focus_area: '', max_focus_hours: 4 };
          const isSaving = saving === idx;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#3A3A3C] last:border-b-0"
            >
              <span className="w-[90px] text-sm text-[#98989F] shrink-0">{dayName}</span>
              <input
                value={draft.focus_area}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [idx]: { ...draft, focus_area: e.target.value } }))
                }
                onBlur={() => handleBlur(idx)}
                placeholder="e.g. deep work, rest, freelance…"
                className="flex-1 bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F7] placeholder-[#48484A] outline-none focus:border-[#C084FC] transition-colors"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={draft.max_focus_hours}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [idx]: { ...draft, max_focus_hours: Math.max(0, parseInt(e.target.value) || 0) },
                    }))
                  }
                  onBlur={() => handleBlur(idx)}
                  className="w-14 bg-[#3A3A3C] border border-[#48484A] rounded-lg px-2 py-1.5 text-sm text-[#F5F5F7] outline-none focus:border-[#C084FC] transition-colors text-center"
                />
                <span className="text-xs text-[#98989F]">h max</span>
              </div>
              {isSaving && (
                <div className="w-3 h-3 border border-t-transparent border-[#C084FC] rounded-full animate-spin shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Habits Manager ───────────────────────────────────────────────────────────

const HABIT_CATEGORIES = ['faith', 'body', 'growth'] as const;
const TIMES_OF_DAY = ['morning', 'evening', 'anytime'] as const;

type HabitCategory = (typeof HABIT_CATEGORIES)[number];
type TimeOfDay = (typeof TIMES_OF_DAY)[number];

const CAT_BADGE: Record<HabitCategory, string> = {
  faith:  'bg-[#2A1A2A] text-[#F472B6]',
  body:   'bg-[#1A3A1A] text-[#4ADE80]',
  growth: 'bg-[#2A1A3A] text-[#C084FC]',
};

interface HabitDraft {
  name: string;
  category: HabitCategory;
  time_of_day: TimeOfDay;
  duration_minutes: number;
}

function HabitsManager() {
  const { habits, refetch } = usePersonalOS();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<HabitDraft | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<HabitDraft>({
    name: '', category: 'growth', time_of_day: 'anytime', duration_minutes: 15,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setEditDraft({
      name: habit.name,
      category: habit.category as HabitCategory,
      time_of_day: habit.time_of_day as TimeOfDay,
      duration_minutes: habit.duration_minutes,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDraft || saving) return;
    setSaving(true);
    try {
      await api.patch(`/habits/${id}`, editDraft);
      await refetch();
      setEditingId(null);
      toast.success('Habit updated', { style: TOAST_STYLE });
    } catch {
      toast.error('Failed to update habit', { style: ERROR_STYLE });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/habits/${id}`);
      await refetch();
      toast.success('Habit removed', { style: TOAST_STYLE });
    } catch {
      toast.error('Failed to remove habit', { style: ERROR_STYLE });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newDraft.name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post('/habits', { ...newDraft, name: newDraft.name.trim() });
      await refetch();
      setAdding(false);
      setNewDraft({ name: '', category: 'growth', time_of_day: 'anytime', duration_minutes: 15 });
      toast.success('Habit added', { style: TOAST_STYLE });
    } catch {
      toast.error('Failed to add habit', { style: ERROR_STYLE });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-[#F5F5F7] mb-1">Habits</h2>
      <p className="text-xs text-[#98989F] mb-4">
        Manage your daily habits. The AI tracks completion and can mark them done via natural language.
      </p>

      <div className="rounded-xl border border-[#48484A] overflow-hidden mb-3">
        {habits.filter(h => h.active).length === 0 && !adding && (
          <p className="text-sm text-[#98989F] px-4 py-6 text-center">No habits yet. Add one below.</p>
        )}

        {habits.filter(h => h.active).map((habit) => (
          <div key={habit.id} className="border-b border-[#3A3A3C] last:border-b-0">
            {editingId === habit.id && editDraft ? (
              /* ── Edit form ── */
              <div className="px-4 py-3 flex flex-col gap-2">
                <input
                  autoFocus
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(habit.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full bg-[#3A3A3C] border border-[#C084FC] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F7] outline-none"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={editDraft.category}
                    onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value as HabitCategory })}
                    className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none"
                  >
                    {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={editDraft.time_of_day}
                    onChange={(e) => setEditDraft({ ...editDraft, time_of_day: e.target.value as TimeOfDay })}
                    className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none"
                  >
                    {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={editDraft.duration_minutes}
                      onChange={(e) => setEditDraft({ ...editDraft, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="w-14 text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none text-center"
                    />
                    <span className="text-xs text-[#98989F]">min</span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleSaveEdit(habit.id)}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded bg-[#C084FC] text-black font-medium disabled:opacity-50"
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-[#98989F] hover:text-[#F5F5F7]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Display row ── */
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F5F5F7] truncate">{habit.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CAT_BADGE[habit.category as HabitCategory] ?? 'bg-[#3A3A3C] text-[#98989F]'}`}>
                      {habit.category}
                    </span>
                    <span className="text-[10px] text-[#98989F]">{habit.time_of_day}</span>
                    {habit.duration_minutes > 0 && (
                      <span className="text-[10px] text-[#98989F]">{habit.duration_minutes}min</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => startEdit(habit)}
                  className="text-xs text-[#98989F] hover:text-[#F5F5F7] px-2 py-1 rounded hover:bg-[#3A3A3C] transition-colors shrink-0"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  disabled={deletingId === habit.id}
                  className="text-xs text-[#E24B4A] hover:text-red-300 px-2 py-1 rounded hover:bg-[#3A1A1A] transition-colors shrink-0 disabled:opacity-50"
                >
                  {deletingId === habit.id ? '…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new habit */}
      {adding ? (
        <div className="rounded-xl border border-[#C084FC] bg-[#2C2C2E] p-4 flex flex-col gap-2">
          <input
            autoFocus
            value={newDraft.name}
            onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Habit name…"
            className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F7] placeholder-[#48484A] outline-none focus:border-[#C084FC]"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newDraft.category}
              onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value as HabitCategory })}
              className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none"
            >
              {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={newDraft.time_of_day}
              onChange={(e) => setNewDraft({ ...newDraft, time_of_day: e.target.value as TimeOfDay })}
              className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none"
            >
              {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={newDraft.duration_minutes}
                onChange={(e) => setNewDraft({ ...newDraft, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-14 text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none text-center"
              />
              <span className="text-xs text-[#98989F]">min</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleAdd}
                disabled={saving || !newDraft.name.trim()}
                className="text-xs px-3 py-1 rounded bg-[#C084FC] text-black font-medium disabled:opacity-50"
              >
                {saving ? '…' : 'Add'}
              </button>
              <button onClick={() => setAdding(false)} className="text-xs text-[#98989F] hover:text-[#F5F5F7]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 text-sm text-[#98989F] hover:text-[#F5F5F7] border border-dashed border-[#48484A] hover:border-[#98989F] rounded-xl transition-colors"
        >
          + Add habit
        </button>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <PersonalOSLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-[#F5F5F7] mb-6">Settings</h1>
        <DayRulesEditor />
        <HabitsManager />
      </div>
    </PersonalOSLayout>
  );
}
