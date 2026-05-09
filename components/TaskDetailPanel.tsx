'use client';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useActiveTask } from '@/lib/state/activeTask';
import { useTask, useUpdateTask, useDeleteTask } from '@/lib/api/hooks';
import { useSaveIndicator, type SaveState } from '@/lib/hooks/useSaveIndicator';
import { toast } from 'sonner';
import type { Task, Category, Priority, Status } from '@/lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<Category, { bg: string; text: string; bgDark: string; textDark: string; label: string }> = {
  career:    { bg: 'bg-[#FFF7ED]', text: 'text-[#C2410C]', bgDark: 'dark:bg-[#431407]', textDark: 'dark:text-[#FB923C]', label: 'Career' },
  lms:       { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', bgDark: 'dark:bg-[#172554]', textDark: 'dark:text-[#60A5FA]', label: 'LMS' },
  freelance: { bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]', bgDark: 'dark:bg-[#1E1B4B]', textDark: 'dark:text-[#818CF8]', label: 'Freelance' },
  learning:  { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]', bgDark: 'dark:bg-[#2E1065]', textDark: 'dark:text-[#A78BFA]', label: 'Learning' },
  uber:      { bg: 'bg-[#F8FAFC]', text: 'text-[#475569]', bgDark: 'dark:bg-[#1E293B]', textDark: 'dark:text-[#94A3B8]', label: 'Uber' },
  faith:     { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', bgDark: 'dark:bg-[#451A03]', textDark: 'dark:text-[#FBBF24]', label: 'Faith' },
};

const PRIORITY_PILLS: { value: Priority; label: string; activeBg: string; activeText: string }[] = [
  { value: 1, label: 'P1', activeBg: 'bg-p1', activeText: 'text-white' },
  { value: 2, label: 'P2', activeBg: 'bg-p2', activeText: 'text-white' },
  { value: 3, label: 'P3', activeBg: 'bg-p3', activeText: 'text-white' },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'this_week', label: 'This Week' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const STATUS_DOT: Record<Status, string> = {
  backlog: 'bg-gray-400',
  this_week: 'bg-blue-500',
  in_progress: 'bg-green-500',
  done: 'bg-gray-400',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMinutes(m: number): string {
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Save Indicator ─────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs transition-opacity ${
      state === 'saved' ? 'opacity-100' : ''
    }`}>
      {state === 'saving' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-secondary">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-500">Saved</span>
        </>
      )}
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

export function TaskDetailPanel() {
  const { activeTaskId, setActiveTaskId } = useActiveTask();
  const { data: task, isLoading } = useTask(activeTaskId ?? undefined);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { state: saveState, markSaving, markSaved, markIdle } = useSaveIndicator();

  // Slide-in animation
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Local editable state
  const [title, setTitle] = useState('');
  const [lastLeftOff, setLastLeftOff] = useState('');
  const [notes, setNotes] = useState('');
  const [nextSteps, setNextSteps] = useState<{ text: string; done: boolean }[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [showLogInput, setShowLogInput] = useState(false);
  const [assignedDay, setAssignedDay] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sync task data to local state when task loads or changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setLastLeftOff(task.lastLeftOff ?? '');
      setNotes(task.notes ?? '');
      setNextSteps(task.nextSteps ?? []);
      setAssignedDay(task.assignedDay ?? '');
      setScheduledTime(task.scheduledTime ?? '');
    }
  }, [task]);

  // Mount/unmount animation
  useEffect(() => {
    if (activeTaskId) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(t);
    }
  }, [activeTaskId]);

  // Escape to close
  useEffect(() => {
    if (!activeTaskId) return;
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setActiveTaskId(null);
      }
    }
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [activeTaskId, setActiveTaskId]);

  const close = useCallback(() => setActiveTaskId(null), [setActiveTaskId]);

  // Debounced patch helper
  const patchField = useCallback(
    (field: string, value: unknown) => {
      if (!activeTaskId) return;
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);

      debounceTimers.current[field] = setTimeout(() => {
        markSaving();
        updateTask.mutate(
          { id: activeTaskId, patch: { [field]: value } as Record<string, unknown> },
          {
            onSuccess: () => markSaved(),
            onError: () => { markIdle(); toast.error('Save failed. Try again.'); },
          },
        );
      }, 800);
    },
    [activeTaskId, updateTask, markSaving, markSaved, markIdle],
  );

  // Immediate patch (no debounce)
  const patchImmediate = useCallback(
    (patch: Record<string, unknown>) => {
      if (!activeTaskId) return;
      markSaving();
      updateTask.mutate(
        { id: activeTaskId, patch },
        {
          onSuccess: () => markSaved(),
          onError: () => { markIdle(); toast.error('Save failed. Try again.'); },
        },
      );
    },
    [activeTaskId, updateTask, markSaving, markSaved, markIdle],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleTitleChange = (val: string) => {
    setTitle(val);
    patchField('title', val);
  };

  const handleTitleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setTitle(task?.title ?? '');
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePriority = (p: Priority) => {
    patchImmediate({ priority: p });
  };

  const handleStatus = (s: Status) => {
    patchImmediate({ status: s });
  };

  const handleLastLeftOff = (val: string) => {
    setLastLeftOff(val);
    patchField('last_left_off', val || undefined);
  };

  const handleNotes = (val: string) => {
    setNotes(val);
    patchField('notes', val || undefined);
  };

  const handleAssignedDay = (val: string) => {
    setAssignedDay(val);
    patchField('assigned_day', val || undefined);
  };

  const handleScheduledTime = (val: string) => {
    setScheduledTime(val);
    patchField('scheduled_time', val || undefined);
  };

  // Next steps
  const toggleStep = (index: number) => {
    const updated = nextSteps.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    setNextSteps(updated);
    patchImmediate({ next_steps: updated });
  };

  const addStep = () => {
    if (!newStepText.trim()) return;
    const updated = [...nextSteps, { text: newStepText.trim(), done: false }];
    setNextSteps(updated);
    setNewStepText('');
    patchImmediate({ next_steps: updated });
  };

  const removeStep = (index: number) => {
    const updated = nextSteps.filter((_, i) => i !== index);
    setNextSteps(updated);
    patchImmediate({ next_steps: updated });
  };

  // Time logging
  const handleLogTime = () => {
    const mins = parseInt(logMinutes, 10);
    if (isNaN(mins) || mins <= 0 || !task) return;
    const newLogged = (task.timeLoggedMinutes ?? 0) + mins;
    patchImmediate({ time_logged_minutes: newLogged });
    setLogMinutes('');
    setShowLogInput(false);
  };

  // Delete
  const handleDelete = () => {
    if (!activeTaskId) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    deleteTask.mutate(
      { id: activeTaskId },
      {
        onSuccess: () => toast.success('Task deleted'),
        onError: () => toast.error("Couldn't delete task. Try again."),
      },
    );
    close();
  };

  if (!mounted) return null;

  const catStyle = task ? CATEGORY_STYLES[task.category] : null;

  // Time tracking values
  const estimated = task?.durationMinutes ?? 0;
  const logged = task?.timeLoggedMinutes ?? 0;
  const progressPct = estimated > 0 ? Math.round((logged / estimated) * 100) : 0;
  const overBudget = progressPct > 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-250 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full w-full md:w-[440px] z-50 bg-surface border-l border-border flex flex-col transition-transform duration-250 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-surface z-10 border-b border-border px-5 py-3 flex items-center gap-3">
              {/* Category badge */}
              {catStyle && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${catStyle.bg} ${catStyle.text} ${catStyle.bgDark} ${catStyle.textDark}`}>
                  {catStyle.label}
                </span>
              )}

              {/* Save indicator */}
              <div className="flex-1 flex justify-center">
                <SaveIndicator state={saveState} />
              </div>

              {/* Close button */}
              <button
                onClick={close}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                aria-label="Close panel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Title */}
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-xl font-medium text-primary bg-transparent border-none outline-none placeholder:text-tertiary"
                placeholder="Task title…"
              />

              {/* Subtitle: schedule + category */}
              <div className="flex items-center gap-2 text-xs text-secondary -mt-4">
                {task.assignedDay && (
                  <span>
                    {task.assignedDay === new Date().toISOString().slice(0, 10)
                      ? 'Today'
                      : task.assignedDay}
                    {task.scheduledTime && `, ${formatTimeDisplay(task.scheduledTime)}`}
                  </span>
                )}
              </div>

              {/* Status + Priority row */}
              <div className="bg-surface-raised rounded-lg p-3">
                <div className="flex items-start gap-6">
                  {/* Status */}
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-1.5 relative">
                      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${STATUS_DOT[task.status]}`} />
                      <select
                        value={task.status}
                        onChange={(e) => handleStatus(e.target.value as Status)}
                        className="w-full pl-7 pr-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                      Priority
                    </label>
                    <div className="mt-1.5 flex gap-1">
                      {PRIORITY_PILLS.map((p) => {
                        const isActive = task.priority === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => handlePriority(p.value)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              isActive
                                ? `${p.activeBg} ${p.activeText}`
                                : 'bg-surface border border-border text-secondary hover:border-accent'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Last left off */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🔖</span>
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Last left off
                  </h3>
                </div>
                <textarea
                  value={lastLeftOff}
                  onChange={(e) => handleLastLeftOff(e.target.value)}
                  placeholder="What were you doing when you last worked on this?"
                  className="w-full min-h-[80px] p-3 text-sm bg-surface-raised border border-border rounded-lg text-primary placeholder:text-tertiary resize-y focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Next steps */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">📋</span>
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Next steps
                  </h3>
                  {nextSteps.length > 0 && (
                    <span className="text-[10px] font-medium text-secondary bg-surface-raised rounded-full px-1.5 py-0.5 ml-1">
                      {nextSteps.filter((s) => s.done).length}/{nextSteps.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {nextSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <button
                        onClick={() => toggleStep(i)}
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          step.done
                            ? 'bg-accent text-white'
                            : 'border-2 border-border hover:border-accent'
                        }`}
                      >
                        {step.done && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          step.done ? 'line-through text-tertiary' : 'text-primary'
                        }`}
                      >
                        {step.text}
                      </span>
                      <button
                        onClick={() => removeStep(i)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-tertiary hover:text-p1 transition-opacity"
                        aria-label="Remove step"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addStep();
                  }}
                  className="mt-2"
                >
                  <input
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder="+ Add step"
                    className="w-full px-2 py-1.5 text-sm bg-transparent border-none text-primary placeholder:text-tertiary focus:outline-none"
                  />
                </form>
              </div>

              {/* Time + Schedule row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Time tracking */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">⏱</span>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Time
                    </h3>
                  </div>
                  <div className="bg-surface-raised border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-secondary">Logged / Est</span>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {formatMinutes(logged)} / {formatMinutes(estimated)}
                    </p>
                    {/* Progress bar */}
                    {estimated > 0 && (
                      <div className="h-1.5 w-full bg-surface rounded-full">
                        <div
                          className={`h-full rounded-full transition-all ${
                            overBudget ? 'bg-p1' : 'bg-accent'
                          }`}
                          style={{ width: `${Math.min(progressPct, 100)}%` }}
                        />
                      </div>
                    )}
                    {/* Log time */}
                    {showLogInput ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={logMinutes}
                          onChange={(e) => setLogMinutes(e.target.value)}
                          placeholder="mins"
                          className="w-16 px-2 py-1 text-sm bg-surface border border-border rounded text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLogTime();
                            if (e.key === 'Escape') {
                              setShowLogInput(false);
                              setLogMinutes('');
                            }
                          }}
                        />
                        <button
                          onClick={handleLogTime}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLogInput(true)}
                        className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Log time
                      </button>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">📅</span>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Schedule
                    </h3>
                  </div>
                  <div className="bg-surface-raised border border-border rounded-lg p-3 space-y-2">
                    <input
                      type="date"
                      value={assignedDay}
                      onChange={(e) => handleAssignedDay(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-surface border border-border rounded text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => handleScheduledTime(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-surface border border-border rounded text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">📝</span>
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Notes
                  </h3>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotes(e.target.value)}
                  placeholder="Click to add detailed notes, links, or context…"
                  className="w-full min-h-[100px] p-3 text-sm bg-surface-raised border border-border rounded-lg text-primary placeholder:text-tertiary resize-y focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Activity stub */}
              <div>
                <h3 className="text-[10px] font-semibold text-secondary uppercase tracking-widest mb-2">
                  Activity
                </h3>
                <div className="text-xs text-tertiary space-y-1">
                  <p>Created {timeAgo(task.createdAt)}</p>
                  {task.updatedAt !== task.createdAt && (
                    <p>Last edited {timeAgo(task.updatedAt)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-border px-5 py-3 flex items-center gap-3">
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-sm text-p1 bg-transparent hover:bg-p1/10 rounded-lg px-3 py-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Task
              </button>
              <div className="flex-1" />
              <button
                onClick={() => {
                  if (task.status !== 'done') {
                    patchImmediate({ status: 'done' });
                  }
                  close();
                }}
                className="px-4 py-2 text-sm font-medium bg-surface border border-border rounded-lg text-primary hover:bg-surface-raised transition-colors"
              >
                {task.status === 'done' ? 'Close' : 'Done'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function formatTimeDisplay(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
