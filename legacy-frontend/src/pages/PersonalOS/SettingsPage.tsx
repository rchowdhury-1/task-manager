import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Habit, DAY_NAMES_LONG } from '../../types/personalOS';
import api from '../../api/axios';

const TOAST_OK  = { style: { background: '#fff', color: '#111827', border: '1px solid #E5E7EB' } };
const TOAST_ERR = { style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' } };

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
      toast.success('Saved', TOAST_OK);
    } catch {
      toast.error('Failed to save day rule', TOAST_ERR);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Day Rules</h2>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Set the focus area and max working hours for each day. The AI uses these to warn about schedule conflicts.
      </p>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        {DAY_NAMES_LONG.map((dayName, idx) => {
          const draft = drafts[idx] ?? { focus_area: '', max_focus_hours: 4 };
          const isSaving = saving === idx;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
              style={{ borderColor: '#F3F4F6', background: '#FFFFFF' }}
            >
              <span className="w-[90px] text-sm shrink-0" style={{ color: '#6B7280' }}>{dayName}</span>
              <input
                value={draft.focus_area}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [idx]: { ...draft, focus_area: e.target.value } }))
                }
                onBlur={() => handleBlur(idx)}
                placeholder="e.g. deep work, rest, freelance…"
                className="flex-1 rounded-lg px-3 py-1.5 text-sm border transition-colors"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
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
                  className="w-14 rounded-lg px-2 py-1.5 text-sm border text-center transition-colors"
                  style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>h max</span>
              </div>
              {isSaving && (
                <div className="w-3 h-3 border-2 border-t-transparent border-red-400 rounded-full animate-spin shrink-0" />
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
  faith:  'bg-pink-50 text-pink-500',
  body:   'bg-green-50 text-green-600',
  growth: 'bg-purple-50 text-purple-600',
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
      toast.success('Habit updated', TOAST_OK);
    } catch {
      toast.error('Failed to update habit', TOAST_ERR);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/habits/${id}`);
      await refetch();
      toast.success('Habit removed', TOAST_OK);
    } catch {
      toast.error('Failed to remove habit', TOAST_ERR);
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
      toast.success('Habit added', TOAST_OK);
    } catch {
      toast.error('Failed to add habit', TOAST_ERR);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "text-xs rounded-lg px-2 py-1 border outline-none";
  const inputStyle = { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' };

  return (
    <section>
      <h2 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Habits</h2>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Manage your daily habits. The AI can mark them complete via natural language.
      </p>

      <div className="rounded-xl border overflow-hidden mb-3" style={{ borderColor: '#E5E7EB' }}>
        {habits.filter(h => h.active).length === 0 && !adding && (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#9CA3AF' }}>No habits yet. Add one below.</p>
        )}

        {habits.filter(h => h.active).map((habit) => (
          <div key={habit.id} className="border-b last:border-b-0" style={{ borderColor: '#F3F4F6', background: '#FFFFFF' }}>
            {editingId === habit.id && editDraft ? (
              <div className="px-4 py-3 flex flex-col gap-2">
                <input
                  autoFocus
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(habit.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full text-sm rounded-lg px-3 py-1.5 border outline-none"
                  style={{ background: '#F9FAFB', borderColor: '#EF4444', color: '#111827' }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={editDraft.category}
                    onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value as HabitCategory })}
                    className={inputCls} style={inputStyle}>
                    {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={editDraft.time_of_day}
                    onChange={(e) => setEditDraft({ ...editDraft, time_of_day: e.target.value as TimeOfDay })}
                    className={inputCls} style={inputStyle}>
                    {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} value={editDraft.duration_minutes}
                      onChange={(e) => setEditDraft({ ...editDraft, duration_minutes: parseInt(e.target.value) || 0 })}
                      className={`w-14 ${inputCls} text-center`} style={inputStyle} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>min</span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => handleSaveEdit(habit.id)} disabled={saving}
                      className="text-xs px-3 py-1 rounded-lg font-semibold disabled:opacity-50"
                      style={{ background: '#EF4444', color: '#fff' }}>
                      {saving ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: '#6B7280' }}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#111827' }}>{habit.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CAT_BADGE[habit.category as HabitCategory] ?? 'bg-gray-50 text-gray-500'}`}>
                      {habit.category}
                    </span>
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{habit.time_of_day}</span>
                    {habit.duration_minutes > 0 && (
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{habit.duration_minutes}min</span>
                    )}
                  </div>
                </div>
                <button onClick={() => startEdit(habit)}
                  className="text-xs px-2 py-1 rounded-lg border transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(habit.id)} disabled={deletingId === habit.id}
                  className="text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50"
                  style={{ borderColor: '#FECACA', color: '#EF4444' }}>
                  {deletingId === habit.id ? '…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: '#EF4444', background: '#FEF2F2' }}>
          <input autoFocus value={newDraft.name}
            onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Habit name…"
            className="w-full text-sm rounded-lg px-3 py-1.5 border outline-none"
            style={{ background: '#fff', borderColor: '#E5E7EB', color: '#111827' }} />
          <div className="flex items-center gap-2 flex-wrap">
            <select value={newDraft.category}
              onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value as HabitCategory })}
              className={inputCls} style={{ ...inputStyle, background: '#fff' }}>
              {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newDraft.time_of_day}
              onChange={(e) => setNewDraft({ ...newDraft, time_of_day: e.target.value as TimeOfDay })}
              className={inputCls} style={{ ...inputStyle, background: '#fff' }}>
              {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={0} value={newDraft.duration_minutes}
                onChange={(e) => setNewDraft({ ...newDraft, duration_minutes: parseInt(e.target.value) || 0 })}
                className={`w-14 ${inputCls} text-center`} style={{ ...inputStyle, background: '#fff' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>min</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={handleAdd} disabled={saving || !newDraft.name.trim()}
                className="text-xs px-3 py-1 rounded-lg font-semibold disabled:opacity-50"
                style={{ background: '#EF4444', color: '#fff' }}>
                {saving ? '…' : 'Add'}
              </button>
              <button onClick={() => setAdding(false)} className="text-xs" style={{ color: '#6B7280' }}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 text-sm rounded-xl border border-dashed transition-colors"
          style={{ borderColor: '#E5E7EB', color: '#9CA3AF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}>
          + Add habit
        </button>
      )}
    </section>
  );
}

// ─── CalDAV Settings ──────────────────────────────────────────────────────────

interface CalDAVForm {
  caldav_url: string;
  caldav_username: string;
  caldav_password: string;
  caldav_calendar_path: string;
  caldav_password_set: boolean;
}

function CalDAVSettings() {
  const [form, setForm] = useState<CalDAVForm>({
    caldav_url: 'https://caldav.icloud.com',
    caldav_username: '',
    caldav_password: '',
    caldav_calendar_path: '',
    caldav_password_set: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    api.get('/settings')
      .then(r => {
        setForm(prev => ({
          ...prev,
          caldav_url: r.data.caldav_url || 'https://caldav.icloud.com',
          caldav_username: r.data.caldav_username || '',
          caldav_calendar_path: r.data.caldav_calendar_path || '',
          caldav_password_set: r.data.caldav_password_set || false,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, string> = {
        caldav_url: form.caldav_url,
        caldav_username: form.caldav_username,
        caldav_calendar_path: form.caldav_calendar_path,
      };
      if (form.caldav_password) payload.caldav_password = form.caldav_password;
      const r = await api.patch('/settings', payload);
      setForm(prev => ({
        ...prev,
        caldav_password: '',
        caldav_password_set: r.data.caldav_password_set,
      }));
      toast.success('CalDAV settings saved', TOAST_OK);
    } catch {
      toast.error('Failed to save settings', TOAST_ERR);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post('/settings/caldav-test', {});
      setTestResult(r.data);
    } catch {
      setTestResult({ success: false, message: 'Request failed — check your network.' });
    } finally {
      setTesting(false);
    }
  };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors";
  const inputStyle = { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' };

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>iCloud CalDAV Sync</h2>
        <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: '#E5E7EB' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>iCloud CalDAV Sync</h2>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Sync tasks to your iCloud calendar. Use an{' '}
        <span className="font-medium" style={{ color: '#111827' }}>app-specific password</span>
        {' '}from appleid.apple.com, not your regular iCloud password.
      </p>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        {[
          { label: 'Server URL', key: 'caldav_url', placeholder: 'https://caldav.icloud.com', type: 'url' },
          { label: 'Apple ID (email)', key: 'caldav_username', placeholder: 'you@icloud.com', type: 'email' },
          { label: 'App-Specific Password', key: 'caldav_password', placeholder: form.caldav_password_set ? '••••••••  (set — enter new to change)' : 'xxxx-xxxx-xxxx-xxxx', type: 'password' },
          { label: 'Calendar Path', key: 'caldav_calendar_path', placeholder: '/dav/principal/calendars/home/', type: 'text' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: '#F3F4F6', background: '#FFFFFF' }}>
            <span className="w-36 text-sm shrink-0" style={{ color: '#6B7280' }}>{label}</span>
            <input
              type={type}
              value={form[key as keyof CalDAVForm] as string}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className={inputCls}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: '#EF4444', color: '#fff' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !form.caldav_password_set}
          className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
          style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
        {testResult && (
          <span
            className="text-xs font-medium"
            style={{ color: testResult.success ? '#10B981' : '#EF4444' }}
          >
            {testResult.success ? '✓ ' : '✕ '}{testResult.message}
          </span>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <PersonalOSLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold mb-6" style={{ color: '#111827' }}>Settings</h1>
        <DayRulesEditor />
        <HabitsManager />
        <CalDAVSettings />
      </div>
    </PersonalOSLayout>
  );
}
