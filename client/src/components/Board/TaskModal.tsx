import { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Priority, BoardMember } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { useSocketStore } from '../../store/socketStore';
import { Badge } from '../Shared/Badge';
import { Avatar } from '../Shared/Avatar';
import { Button } from '../Shared/Button';
import { formatDueDate, isOverdue } from '../../utils/helpers';
import { useBoard } from '../../hooks/useBoard';
import toast from 'react-hot-toast';

interface TaskModalProps {
  task: Task;
  members: BoardMember[];
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

export function TaskModal({ task, members, onClose }: TaskModalProps) {
  const { updateTask, deleteTask } = useTaskStore();
  const { emitTyping } = useBoard(task.board_id);
  const socket = useSocketStore((s) => s.socket);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [dueDate, setDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ''
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const descDebounce = useRef<ReturnType<typeof setTimeout>>();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  // Listen for typing events on this task
  useEffect(() => {
    if (!socket) return;
    const handler = ({ userId, displayName, taskId }: { userId: string; displayName: string; taskId: string }) => {
      if (taskId === task.id) {
        setTypingUser(displayName);
        setTimeout(() => setTypingUser(null), 3000);
      }
    };
    socket.on('user-typing', handler);
    return () => { socket.off('user-typing', handler); };
  }, [socket, task.id]);

  const saveTitle = useCallback(() => {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
      socket?.emit('task-update', { taskId: task.id, changes: { title: title.trim() } });
    }
    setEditingTitle(false);
  }, [title, task.id, task.title, updateTask, socket]);

  const saveDescription = useCallback((val: string) => {
    if (val !== task.description) {
      updateTask(task.id, { description: val || null });
      socket?.emit('task-update', { taskId: task.id, changes: { description: val || null } });
    }
  }, [task.id, task.description, updateTask, socket]);

  const handleDescChange = (val: string) => {
    setDescription(val);
    emitTyping(task.id);
    clearTimeout(descDebounce.current);
    descDebounce.current = setTimeout(() => saveDescription(val), 800);
  };

  const handlePriorityChange = (p: Priority) => {
    setPriority(p);
    updateTask(task.id, { priority: p });
    socket?.emit('task-update', { taskId: task.id, changes: { priority: p } });
  };

  const handleAssigneeChange = (userId: string) => {
    setAssignedTo(userId);
    updateTask(task.id, { assignedTo: userId || null });
    socket?.emit('task-update', { taskId: task.id, changes: { assignedTo: userId || null } });
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    updateTask(task.id, { dueDate: val || null });
    socket?.emit('task-update', { taskId: task.id, changes: { dueDate: val || null } });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    socket?.emit('task-delete', { taskId: task.id });
    toast.success('Task deleted');
    onClose();
  };

  const assignee = members.find((m) => m.id === assignedTo);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 flex flex-col animate-slide-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <Badge priority={priority} />
          <div className="flex items-center gap-2">
            {typingUser && (
              <span className="text-xs text-amber-400 animate-pulse">
                {typingUser} is editing...
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Title */}
          <div>
            {editingTitle ? (
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(task.title); setEditingTitle(false); } }}
                className="w-full text-xl font-semibold text-slate-100 bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 focus:outline-none"
              />
            ) : (
              <h2
                className="text-xl font-semibold text-slate-100 cursor-text hover:text-white transition-colors"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    priority === p
                      ? `ring-2 ring-offset-1 ring-offset-slate-900 ${
                          p === 'low' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-emerald-500'
                          : p === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-amber-500'
                          : p === 'high' ? 'bg-orange-500/20 border-orange-500 text-orange-300 ring-orange-500'
                          : 'bg-rose-500/20 border-rose-500 text-rose-300 ring-rose-500'
                        }`
                      : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Assignee
            </label>
            <div className="flex items-center gap-3">
              {assignee && (
                <Avatar name={assignee.display_name} color={assignee.avatar_color} size="sm" />
              )}
              <select
                value={assignedTo}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  dueDate && isOverdue(dueDate)
                    ? 'border-rose-500/50 text-rose-300'
                    : 'border-slate-700 text-slate-300'
                }`}
              />
            </div>
            {dueDate && (
              <p className={`text-xs mt-1 ${isOverdue(dueDate) ? 'text-rose-400' : 'text-slate-500'}`}>
                {formatDueDate(dueDate)}
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="pt-2 border-t border-slate-700/50 space-y-2">
            <p className="text-xs text-slate-600">
              Created {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 flex-1">Delete this task?</span>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-slate-500 hover:text-rose-400 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete task
            </button>
          )}
        </div>
      </div>
    </>
  );
}
