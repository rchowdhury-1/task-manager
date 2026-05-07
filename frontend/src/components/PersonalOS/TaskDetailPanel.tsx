import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, TaskActivity, CATEGORY_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../types/personalOS';

// Lazy: not bundled until first open
const TaskDetailPanelInner = lazy(() => Promise.resolve({ default: PanelInner }));

function ActivityEntry({ entry }: { entry: TaskActivity }) {
  const actionLabels: Record<string, string> = {
    created: 'Created',
    moved: 'Moved',
    note_added: 'Note added',
    next_step_added: 'Next step added',
    completed: 'Completed',
    claude_update: 'Claude updated',
  };
  return (
    <div className="flex gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
          {actionLabels[entry.action] || entry.action}
        </span>
        {entry.payload && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {JSON.stringify(entry.payload).slice(0, 80)}
          </p>
        )}
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
        {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

function PanelInner() {
  const { activeTaskId, setActiveTask, updateTask } = usePersonalOS();
  const [task, setTask] = useState<Task | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newStep, setNewStep] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [showNotePreview, setShowNotePreview] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeTaskId) { setTask(null); return; }
    api.get<Task>(`/tasks/${activeTaskId}`)
      .then((res) => setTask(res.data))
      .catch(() => setTask(null));
  }, [activeTaskId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTask(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTask]);

  const debouncedSave = useCallback((id: string, fields: Partial<Task>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.patch<Task>(`/tasks/${id}`, fields);
        updateTask(id, res.data);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1500);
      } catch {
        setSaveState('idle');
      }
    }, 800);
  }, [updateTask]);

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    if (!task) return;
    const updated = { ...task, [field]: value } as Task;
    setTask(updated);
    debouncedSave(task.id, { [field]: value });
  };

  const addNextStep = async () => {
    if (!task || !newStep.trim()) return;
    try {
      const steps = [...task.next_steps, { text: newStep.trim(), done: false }];
      const res = await api.patch<Task>(`/tasks/${task.id}`, { next_steps: steps });
      setTask(res.data);
      updateTask(task.id, res.data);
      setNewStep('');
    } catch { /* noop */ }
  };

  const toggleStep = async (index: number) => {
    if (!task) return;
    try {
      const res = await api.patch<Task>(`/tasks/${task.id}/next-steps/${index}`);
      setTask(res.data);
      updateTask(task.id, res.data);
    } catch { /* noop */ }
  };

  const logTime = async () => {
    if (!task || !logMinutes) return;
    const mins = parseInt(logMinutes, 10);
    if (isNaN(mins) || mins <= 0) return;
    const newTotal = (task.time_logged_minutes || 0) + mins;
    handleFieldChange('time_logged_minutes', newTotal);
    setLogMinutes('');
  };

  if (!task) return null;

  const activityLog = (task.activity_log || []).slice().reverse();
  const catColor = CATEGORY_COLORS[task.category] || '#94a3b8';

  return (
    <div
      className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col border-l overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Save indicator */}
      {saveState !== 'idle' && (
        <div className="absolute top-3 right-12 text-xs" style={{ color: saveState === 'saved' ? 'var(--primary)' : 'var(--text-muted)' }}>
          {saveState === 'saving' ? 'saving…' : 'saved ✓'}
        </div>
      )}

      {/* Close */}
      <button
        onClick={() => setActiveTask(null)}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors"
        style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}
      >
        ×
      </button>

      <div className="p-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: catColor + '22', color: catColor }}>
              {task.category}
            </span>
            {/* Priority toggle */}
            <div className="flex gap-1">
              {([1,2,3] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handleFieldChange('priority', p)}
                  className="px-2 py-0.5 rounded text-xs font-medium border transition-all"
                  style={{
                    borderColor: task.priority === p ? PRIORITY_COLORS[p] : 'var(--border)',
                    background: task.priority === p ? PRIORITY_COLORS[p] + '22' : 'transparent',
                    color: task.priority === p ? PRIORITY_COLORS[p] : 'var(--text-muted)',
                  }}
                >
                  P{p}
                </button>
              ))}
            </div>
            {/* Status */}
            <select
              value={task.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="ml-auto text-xs px-2 py-1 rounded border"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <option value="backlog">Backlog</option>
              <option value="this_week">This Week</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{task.title}</h2>
        </div>

        {/* Last left off */}
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Last left off</label>
          <textarea
            value={task.last_left_off || ''}
            onChange={(e) => handleFieldChange('last_left_off', e.target.value)}
            placeholder="Where did you last leave this task?"
            rows={2}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm border"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Next steps */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Next steps</label>
          <div className="flex flex-col gap-1 mb-2">
            {task.next_steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <button
                  onClick={() => toggleStep(i)}
                  className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: step.done ? 'var(--primary)' : 'var(--border)',
                    background: step.done ? 'var(--primary)' : 'transparent',
                  }}
                >
                  {step.done && <span className="text-white text-xs">✓</span>}
                </button>
                <span
                  className="text-sm"
                  style={{
                    color: step.done ? 'var(--text-muted)' : 'var(--text)',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}
                >
                  {step.text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNextStep()}
              placeholder="Add next step…"
              className="flex-1 rounded-lg px-3 py-1.5 text-sm border"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={addNextStep}
              className="px-3 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--primary)' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Time tracking */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Time</label>
          <div className="flex items-center gap-4">
            <div className="text-sm" style={{ color: 'var(--text)' }}>
              <span style={{ color: 'var(--primary)' }}>{Math.round((task.time_logged_minutes || 0) / 60 * 10) / 10}h</span>
              <span style={{ color: 'var(--text-muted)' }}> / {Math.round((task.duration_minutes || 60) / 60 * 10) / 10}h est.</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <input
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && logTime()}
                placeholder="min"
                type="number"
                min="1"
                className="w-16 rounded px-2 py-1 text-xs border text-center"
                style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={logTime}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--primary)' }}
              >
                Log
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: 'var(--primary)',
                width: `${Math.min(100, Math.round((task.time_logged_minutes / task.duration_minutes) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Notes (markdown)</label>
            <button
              onClick={() => setShowNotePreview(!showNotePreview)}
              className="text-xs"
              style={{ color: 'var(--primary)' }}
            >
              {showNotePreview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {showNotePreview ? (
            <div
              className="min-h-20 rounded-lg px-3 py-2 text-sm border prose prose-invert max-w-none"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)', whiteSpace: 'pre-wrap' }}
            >
              {task.notes || <span style={{ color: 'var(--text-muted)' }}>No notes yet.</span>}
            </div>
          ) : (
            <textarea
              value={task.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Markdown notes…"
              rows={4}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm border"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          )}
        </div>

        {/* Assigned day + time */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Scheduled</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={task.assigned_day || ''}
              onChange={(e) => handleFieldChange('assigned_day', e.target.value || null)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm border"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <input
              type="time"
              value={task.scheduled_time || ''}
              onChange={(e) => handleFieldChange('scheduled_time', e.target.value || null)}
              className="rounded-lg px-3 py-1.5 text-sm border"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          {task.cal_event_uid && (
            <p className="mt-1 text-xs" style={{ color: 'var(--primary)' }}>✓ Synced to Apple Calendar</p>
          )}
        </div>

        {/* Activity log */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Activity ({activityLog.length})
          </label>
          <div className="max-h-48 overflow-y-auto">
            {activityLog.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
            )}
            {activityLog.map((entry) => (
              <ActivityEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPanel() {
  const { activeTaskId } = usePersonalOS();
  if (!activeTaskId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => {/* handled by panel close */}}
      />
      <Suspense fallback={null}>
        <TaskDetailPanelInner />
      </Suspense>
    </>
  );
}
