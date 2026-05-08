import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { marked } from 'marked';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, TaskActivity, CATEGORY_LABELS } from '../../types/personalOS';

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: '#EF4444', bg: '#FEF2F2' },
  2: { label: 'P2', color: '#F59E0B', bg: '#FFFBEB' },
  3: { label: 'P3', color: '#10B981', bg: '#ECFDF5' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-blue-50 text-blue-600',
  lms:      'bg-green-50 text-green-600',
  freelance:'bg-yellow-50 text-yellow-700',
  learning: 'bg-purple-50 text-purple-600',
  uber:     'bg-orange-50 text-orange-600',
  faith:    'bg-pink-50 text-pink-600',
};

const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',       label: 'Done' },
];

const ACTION_COLOR: Record<string, string> = {
  created:         '#10B981',
  completed:       '#3B82F6',
  groq_update:     '#8B5CF6',
  moved:           '#F59E0B',
  status_change:   '#F59E0B',
  note_added:      '#9CA3AF',
  next_step_added: '#9CA3AF',
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function actionLabel(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case 'created':         return 'Task created';
    case 'completed':       return 'Marked as done';
    case 'groq_update':     return `AI: ${String(payload.type ?? 'update')}`;
    case 'moved':           return `Moved: ${String(payload.from ?? '')} → ${String(payload.to ?? '')}`;
    case 'note_added':      return 'Note added';
    case 'next_step_added': return 'Step updated';
    default:                return action.replace(/_/g, ' ');
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-6 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-100 animate-pulse" style={{ height: i === 0 ? 32 : 56 }} />
      ))}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#9CA3AF' }}>
      {children}
    </p>
  );
}

// ─── TaskDetailPanel ──────────────────────────────────────────────────────────

export default function TaskDetailPanel() {
  const { activeTaskId, setActiveTask, updateTask, deleteTask } = usePersonalOS();
  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notesPreview, setNotesPreview] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logMinutes, setLogMinutes] = useState('');
  const [newStep, setNewStep] = useState('');
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch task on open
  useEffect(() => {
    if (!activeTaskId) return;
    setLoadingTask(true);
    setTask(null);
    api.get<Task>(`/tasks/${activeTaskId}`)
      .then(res => setTask(res.data))
      .catch(() => setActiveTask(null))
      .finally(() => setLoadingTask(false));
  }, [activeTaskId, setActiveTask]);

  // Slide-in on mount
  useEffect(() => { setVisible(true); }, []);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTask(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setActiveTask]);

  const scheduleSave = useCallback((updates: Partial<Task>) => {
    if (!task) return;
    const originalTask = task;
    const newTask = { ...task, ...updates };
    setTask(newTask);
    setSaveState('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await api.patch(`/tasks/${originalTask.id}`, updates);
        updateTask(originalTask.id, updates);
        setSaveState('saved');
        if (savedTimeout.current) clearTimeout(savedTimeout.current);
        savedTimeout.current = setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setTask(originalTask); // revert local state on error
        setSaveState('idle');
        toast.error('Failed to save changes', {
          style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
        });
      }
    }, 800);
  }, [task, updateTask]);

  const handleDelete = async () => {
    if (!task || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      deleteTask(task.id);
      setActiveTask(null);
    } catch {
      toast.error('Failed to delete task', {
        style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
      });
      setDeleting(false);
    }
  };

  if (!activeTaskId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setActiveTask(null)}
      />

      {/* Panel — full-screen on mobile, 440px slide-in on desktop */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 overflow-y-auto"
        style={{
          background: '#FFFFFF',
          borderLeft: '1.5px solid #E5E7EB',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {loadingTask || !task ? (
          <Skeleton />
        ) : (
          <div className="p-6">
            {/* ── HEADER ── */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-4">
                {/* Category + save indicator */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[task.category] ?? 'bg-gray-100 text-gray-500'}`}>
                    {CATEGORY_LABELS[task.category]}
                  </span>
                  {saveState === 'saving' && (
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>saving…</span>
                  )}
                  {saveState === 'saved' && (
                    <span className="text-[10px]" style={{ color: '#10B981' }}>✓ saved</span>
                  )}
                </div>

                {/* Title */}
                <input
                  value={task.title}
                  onChange={e => scheduleSave({ title: e.target.value })}
                  className="w-full bg-transparent text-xl font-medium outline-none border-b border-transparent transition-colors pb-1"
                  style={{ color: '#111827', borderBottomColor: 'transparent' }}
                  onFocus={e => { e.target.style.borderBottomColor = '#E5E7EB'; }}
                  onBlur={e => { e.target.style.borderBottomColor = 'transparent'; }}
                />
              </div>

              {/* Close */}
              <button
                onClick={() => setActiveTask(null)}
                className="w-8 h-8 rounded-lg transition-colors flex items-center justify-center shrink-0"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
              >
                ✕
              </button>
            </div>

            {/* Priority + Status */}
            <div className="flex items-center gap-3 mb-5">
              {/* Priority buttons */}
              <div className="flex gap-1">
                {([1, 2, 3] as (1|2|3)[]).map(p => {
                  const ps = PRIORITY_STYLES[p];
                  const active = task.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => scheduleSave({ priority: p })}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium border transition-all"
                      style={{
                        background: active ? ps.bg : 'transparent',
                        color: active ? ps.color : '#9CA3AF',
                        borderColor: active ? ps.color : '#E5E7EB',
                      }}
                    >
                      {ps.label}
                    </button>
                  );
                })}
              </div>

              {/* Status dropdown */}
              <select
                value={task.status}
                onChange={e => scheduleSave({ status: e.target.value as Task['status'] })}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none transition-colors"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* ── LAST LEFT OFF ── */}
            <div className="mb-5">
              <SectionLabel>Last left off</SectionLabel>
              <textarea
                value={task.last_left_off ?? ''}
                onChange={e => scheduleSave({ last_left_off: e.target.value })}
                rows={2}
                placeholder="What were you doing when you last worked on this?"
                className="w-full rounded-lg p-3 text-sm outline-none transition-colors resize-none"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            {/* ── NEXT STEPS ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <SectionLabel>Next steps</SectionLabel>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                  {task.next_steps.filter(s => !s.done).length} remaining
                </span>
              </div>

              {/* Steps list */}
              <div className="space-y-1.5 mb-2">
                {task.next_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <button
                      onClick={async () => {
                        try {
                          await api.patch(`/tasks/${task.id}/next-steps/${i}`);
                          const newSteps = task.next_steps.map((s, idx) =>
                            idx === i ? { ...s, done: !s.done } : s
                          );
                          const updated = { ...task, next_steps: newSteps };
                          setTask(updated);
                          updateTask(task.id, { next_steps: newSteps });
                        } catch {
                          toast.error('Failed to update step', {
                            style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        background: step.done ? '#10B981' : 'transparent',
                        borderColor: step.done ? '#10B981' : '#D1D5DB',
                        color: '#fff',
                      }}
                    >
                      {step.done ? '✓' : ''}
                    </button>
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: step.done ? '#9CA3AF' : '#111827',
                        textDecoration: step.done ? 'line-through' : 'none',
                      }}
                    >
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add step input */}
              <input
                value={newStep}
                onChange={e => setNewStep(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && newStep.trim()) {
                    const newSteps = [...task.next_steps, { text: newStep.trim(), done: false }];
                    try {
                      await api.patch(`/tasks/${task.id}`, { next_steps: newSteps });
                      const updated = { ...task, next_steps: newSteps };
                      setTask(updated);
                      updateTask(task.id, { next_steps: newSteps });
                      setNewStep('');
                    } catch {
                      toast.error('Failed to add step', {
                        style: { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
                      });
                    }
                  }
                }}
                placeholder="Add a step… (Enter to save)"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            {/* ── TIME TRACKING ── */}
            <div className="mb-5">
              <SectionLabel>Time tracking</SectionLabel>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 rounded-lg p-3 text-center" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Estimated</p>
                  <p className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {formatMinutes(task.duration_minutes)}
                  </p>
                </div>
                <div className="flex-1 rounded-lg p-3 text-center" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Logged</p>
                  <p className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {formatMinutes(task.time_logged_minutes)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: '#F3F4F6' }}>
                {(() => {
                  const pct = task.duration_minutes > 0
                    ? Math.min(100, Math.round((task.time_logged_minutes / task.duration_minutes) * 100))
                    : 0;
                  const isWarn = pct >= 75;
                  return (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isWarn ? '#F59E0B' : '#EF4444' }}
                    />
                  );
                })()}
              </div>

              {showLogForm ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={logMinutes}
                    onChange={e => setLogMinutes(e.target.value)}
                    placeholder="Minutes"
                    min={1}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                  <button
                    onClick={async () => {
                      const mins = parseInt(logMinutes, 10);
                      if (!mins || mins <= 0) { setShowLogForm(false); return; }
                      const newLogged = task.time_logged_minutes + mins;
                      scheduleSave({ time_logged_minutes: newLogged });
                      setShowLogForm(false);
                      setLogMinutes('');
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ background: '#EF4444', color: '#fff' }}
                  >
                    Log
                  </button>
                  <button
                    onClick={() => { setShowLogForm(false); setLogMinutes(''); }}
                    className="text-sm"
                    style={{ color: '#9CA3AF' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="text-sm border border-dashed rounded-lg w-full py-2 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#9CA3AF' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
                >
                  + Log time
                </button>
              )}
            </div>

            {/* ── NOTES ── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>Notes</SectionLabel>
                <button
                  onClick={() => setNotesPreview(p => !p)}
                  className="text-[10px] rounded px-2 py-0.5 transition-colors"
                  style={{ color: '#9CA3AF', border: '1px solid #E5E7EB' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
                >
                  {notesPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {notesPreview ? (
                task.notes ? (
                  <div
                    className="rounded-lg p-3 text-sm min-h-[80px] font-sans leading-relaxed prose prose-sm max-w-none"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    dangerouslySetInnerHTML={{ __html: marked.parse(task.notes) as string }}
                  />
                ) : (
                  <div className="rounded-lg p-3 text-sm min-h-[80px] flex items-center" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <span className="italic" style={{ color: '#9CA3AF' }}>No notes yet</span>
                  </div>
                )
              ) : (
                <textarea
                  value={task.notes ?? ''}
                  onChange={e => scheduleSave({ notes: e.target.value })}
                  rows={4}
                  placeholder="Notes, links, context…"
                  className="w-full rounded-lg p-3 text-sm outline-none transition-colors resize-none"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                  onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              )}
            </div>

            {/* ── SCHEDULE ── */}
            <div className="mb-5">
              <SectionLabel>Schedule</SectionLabel>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] block mb-1" style={{ color: '#9CA3AF' }}>Assigned day</label>
                  <input
                    type="date"
                    value={task.assigned_day ?? ''}
                    onChange={e => scheduleSave({ assigned_day: e.target.value || null })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] block mb-1" style={{ color: '#9CA3AF' }}>Time</label>
                  <input
                    type="time"
                    value={task.scheduled_time ?? ''}
                    onChange={e => scheduleSave({ scheduled_time: e.target.value || null })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.target.style.borderColor = '#EF4444'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
              </div>
            </div>

            {/* ── ACTIVITY LOG ── */}
            {task.activity_log && task.activity_log.length > 0 && (
              <div className="mb-5">
                <SectionLabel>Activity</SectionLabel>
                <div className="space-y-2">
                  {[...task.activity_log].reverse().map((entry: TaskActivity) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ background: ACTION_COLOR[entry.action] ?? '#9CA3AF' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium"
                          style={{ color: ACTION_COLOR[entry.action] ?? '#9CA3AF' }}
                        >
                          {actionLabel(entry.action, entry.payload)}
                        </p>
                        <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── DELETE ── */}
            <div className="pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full text-sm py-2 rounded-lg border transition-colors"
                style={{
                  color: deleting ? '#9CA3AF' : '#EF4444',
                  borderColor: deleting ? '#E5E7EB' : '#FECACA',
                  background: 'transparent',
                }}
                onMouseEnter={e => { if (!deleting) (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {deleting ? 'Deleting…' : 'Delete task'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
