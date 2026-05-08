import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { marked } from 'marked';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, TaskActivity, CATEGORY_LABELS } from '../../types/personalOS';

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: '#FF6B6B', bg: '#2D1F1F' },
  2: { label: 'P2', color: '#FFC068', bg: '#2D2419' },
  3: { label: 'P3', color: '#8DC642', bg: '#1E2A14' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-[#1A2F4A] text-[#60A5FA]',
  lms:      'bg-[#1A3A1A] text-[#4ADE80]',
  freelance:'bg-[#3A2A0A] text-[#FCD34D]',
  learning: 'bg-[#2A1A3A] text-[#C084FC]',
  uber:     'bg-[#3A1A0A] text-[#FB923C]',
  faith:    'bg-[#2A1A2A] text-[#F472B6]',
};

const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',       label: 'Done' },
];

const ACTION_COLOR: Record<string, string> = {
  created:      '#4ADE80',
  completed:    '#60A5FA',
  groq_update:'#C084FC',
  moved:        '#FCD34D',
  status_change:'#FCD34D',
  note_added:   '#98989F',
  next_step_added: '#98989F',
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
    case 'created': return 'Task created';
    case 'completed': return 'Marked as done';
    case 'groq_update': return `AI: ${String(payload.type ?? 'update')}`;
    case 'moved': return `Moved to ${String(payload.new_status ?? '')}`;
    case 'note_added': return 'Note added';
    case 'next_step_added': return 'Step added';
    default: return action.replace(/_/g, ' ');
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-6 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-lg bg-[#3A3A3C] animate-pulse" style={{ height: i === 0 ? 32 : 56 }} />
      ))}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-[#98989F] font-semibold mb-2">
      {children}
    </p>
  );
}

// ─── TaskDetailPanel ──────────────────────────────────────────────────────────

export default function TaskDetailPanel() {
  const { activeTaskId, setActiveTask, updateTask } = usePersonalOS();
  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notesPreview, setNotesPreview] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logMinutes, setLogMinutes] = useState('');
  const [newStep, setNewStep] = useState('');
  const [visible, setVisible] = useState(false);
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
    const newTask = { ...task, ...updates };
    setTask(newTask);
    setSaveState('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await api.patch(`/tasks/${task.id}`, updates);
        updateTask(task.id, updates);
        setSaveState('saved');
        if (savedTimeout.current) clearTimeout(savedTimeout.current);
        savedTimeout.current = setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('idle');
      }
    }, 800);
  }, [task, updateTask]);

  if (!activeTaskId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setActiveTask(null)}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[440px] z-50 border-l border-[#48484A] overflow-y-auto"
        style={{ background: '#2C2C2E', transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-out' }}
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[task.category] ?? 'bg-[#2A2A2A] text-[#98989F]'}`}>
                    {CATEGORY_LABELS[task.category]}
                  </span>
                  {saveState === 'saving' && (
                    <span className="text-[10px] text-[#98989F]">saving…</span>
                  )}
                  {saveState === 'saved' && (
                    <span className="text-[10px] text-[#4ADE80]">✓ saved</span>
                  )}
                </div>

                {/* Title */}
                <input
                  value={task.title}
                  onChange={e => scheduleSave({ title: e.target.value })}
                  className="w-full bg-transparent text-xl font-medium text-[#F5F5F7] outline-none border-b border-transparent focus:border-[#48484A] transition-colors pb-1"
                />
              </div>

              {/* Close */}
              <button
                onClick={() => setActiveTask(null)}
                className="w-8 h-8 rounded-lg bg-[#3A3A3C] hover:bg-[#48484A] transition-colors flex items-center justify-center text-[#98989F] hover:text-[#F5F5F7] shrink-0"
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
                        color: active ? ps.color : '#98989F',
                        borderColor: active ? ps.color : '#48484A',
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
                className="flex-1 bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] outline-none focus:border-[#60A5FA] transition-colors"
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
                className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg p-3 text-sm text-[#F5F5F7] placeholder-[#98989F] outline-none focus:border-[#60A5FA] transition-colors resize-none"
              />
            </div>

            {/* ── NEXT STEPS ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <SectionLabel>Next steps</SectionLabel>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3A3A3C] text-[#98989F]">
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
                        } catch { /* silent */ }
                      }}
                      className="w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        background: step.done ? '#1D9E75' : 'transparent',
                        borderColor: step.done ? '#1D9E75' : '#48484A',
                        color: '#fff',
                      }}
                    >
                      {step.done ? '✓' : ''}
                    </button>
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: step.done ? '#98989F' : '#F5F5F7',
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
                    } catch { /* silent */ }
                  }
                }}
                placeholder="Add a step… (Enter to save)"
                className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#98989F] outline-none focus:border-[#60A5FA] transition-colors"
              />
            </div>

            {/* ── TIME TRACKING ── */}
            <div className="mb-5">
              <SectionLabel>Time tracking</SectionLabel>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 bg-[#3A3A3C] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#98989F] mb-1">Estimated</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatMinutes(task.duration_minutes)}
                  </p>
                </div>
                <div className="flex-1 bg-[#3A3A3C] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#98989F] mb-1">Logged</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatMinutes(task.time_logged_minutes)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-[#48484A] mb-3 overflow-hidden">
                {(() => {
                  const pct = task.duration_minutes > 0
                    ? Math.min(100, Math.round((task.time_logged_minutes / task.duration_minutes) * 100))
                    : 0;
                  const isWarn = pct >= 75;
                  return (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isWarn ? '#EF9F27' : '#60A5FA' }}
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
                    className="flex-1 bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-2 text-sm text-[#F5F5F7] outline-none focus:border-[#60A5FA]"
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
                    className="px-3 py-2 rounded-lg bg-[#C084FC] text-black text-sm font-medium"
                  >
                    Log
                  </button>
                  <button
                    onClick={() => { setShowLogForm(false); setLogMinutes(''); }}
                    className="text-sm text-[#98989F]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="text-sm text-[#98989F] hover:text-[#F5F5F7] border border-dashed border-[#48484A] hover:border-[#98989F] rounded-lg w-full py-2 transition-colors"
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
                  className="text-[10px] text-[#98989F] hover:text-[#F5F5F7] border border-[#48484A] rounded px-2 py-0.5 transition-colors"
                >
                  {notesPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {notesPreview ? (
                task.notes ? (
                  <div
                    className="bg-[#3A3A3C] border border-[#48484A] rounded-lg p-3 text-sm text-[#F5F5F7] min-h-[80px] font-sans leading-relaxed prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: marked.parse(task.notes) as string }}
                  />
                ) : (
                  <div className="bg-[#3A3A3C] border border-[#48484A] rounded-lg p-3 text-sm min-h-[80px] flex items-center">
                    <span className="text-[#98989F] italic">No notes yet</span>
                  </div>
                )
              ) : (
                <textarea
                  value={task.notes ?? ''}
                  onChange={e => scheduleSave({ notes: e.target.value })}
                  rows={4}
                  placeholder="Notes, links, context…"
                  className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg p-3 text-sm text-[#F5F5F7] placeholder-[#98989F] outline-none focus:border-[#60A5FA] transition-colors resize-none"
                />
              )}
            </div>

            {/* ── SCHEDULE ── */}
            <div className="mb-5">
              <SectionLabel>Schedule</SectionLabel>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-[#98989F] block mb-1">Assigned day</label>
                  <input
                    type="date"
                    value={task.assigned_day ?? ''}
                    onChange={e => scheduleSave({ assigned_day: e.target.value || null })}
                    className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-2 text-sm text-[#F5F5F7] outline-none focus:border-[#60A5FA] transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-[#98989F] block mb-1">Time</label>
                  <input
                    type="time"
                    value={task.scheduled_time ?? ''}
                    onChange={e => scheduleSave({ scheduled_time: e.target.value || null })}
                    className="w-full bg-[#3A3A3C] border border-[#48484A] rounded-lg px-3 py-2 text-sm text-[#F5F5F7] outline-none focus:border-[#60A5FA] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── ACTIVITY LOG ── */}
            {task.activity_log && task.activity_log.length > 0 && (
              <div>
                <SectionLabel>Activity</SectionLabel>
                <div className="space-y-2">
                  {[...task.activity_log].reverse().map((entry: TaskActivity) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ background: ACTION_COLOR[entry.action] ?? '#98989F' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium"
                          style={{ color: ACTION_COLOR[entry.action] ?? '#98989F' }}
                        >
                          {actionLabel(entry.action, entry.payload)}
                        </p>
                        <p className="text-[10px] text-[#98989F]">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
