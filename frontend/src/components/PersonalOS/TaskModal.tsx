import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, CATEGORY_LABELS } from '../../types/personalOS';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: Task['status'];
  defaultDay?: string;
}

type Status = Task['status'];
type Priority = 1 | 2 | 3;
type Category = Task['category'];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; bg: string; ring: string }[] = [
  { value: 1, label: 'P1 Urgent', color: '#DC2626', bg: '#FEF2F2', ring: '#EF4444' },
  { value: 2, label: 'P2 Normal', color: '#D97706', bg: '#FFFBEB', ring: '#F59E0B' },
  { value: 3, label: 'P3 Low',    color: '#059669', bg: '#ECFDF5', ring: '#10B981' },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'backlog',      label: 'Backlog' },
  { value: 'this_week',   label: 'This Week' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
];

const CATEGORIES: Category[] = ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'];

export default function TaskModal({ open, onClose, defaultStatus = 'backlog', defaultDay }: TaskModalProps) {
  const { refetch } = usePersonalOS();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]       = useState('');
  const [priority, setPriority] = useState<Priority>(2);
  const [status, setStatus]     = useState<Status>(defaultStatus);
  const [category, setCategory] = useState<Category>('career');
  const [assignedDay, setAssignedDay] = useState(defaultDay ?? '');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle('');
      setPriority(2);
      setStatus(defaultStatus);
      setCategory('career');
      setAssignedDay(defaultDay ?? '');
      setScheduledTime('');
      setDuration(60);
      setSaving(false);
      setError('');
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, defaultStatus, defaultDay]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Task title is required'); return; }
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/tasks', {
        title: title.trim(),
        category,
        priority,
        status,
        assigned_day: assignedDay || null,
        scheduled_time: scheduledTime || null,
        duration_minutes: duration,
      });
      await refetch();
      toast.success('Task added', {
        style: { background: '#fff', color: '#111827', border: '1px solid #E5E7EB' },
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create task';
      setError(msg);
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: '#F3F4F6' }}>
          <h2 className="text-base font-semibold" style={{ color: '#111827' }}>New Task</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors hover:bg-gray-100"
            style={{ color: '#6B7280' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
            placeholder="What needs to be done?"
            className="w-full text-base font-medium rounded-xl px-4 py-3 border transition-colors"
            style={{
              background: '#F9FAFB',
              borderColor: error ? '#EF4444' : '#E5E7EB',
              color: '#111827',
              outline: 'none',
            }}
          />

          {/* Priority */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Priority</p>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all border-2"
                  style={{
                    background: priority === opt.value ? opt.bg : '#F9FAFB',
                    borderColor: priority === opt.value ? opt.ring : '#E5E7EB',
                    color: priority === opt.value ? opt.color : '#6B7280',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    background: status === opt.value ? '#FEF2F2' : '#F9FAFB',
                    borderColor: status === opt.value ? '#EF4444' : '#E5E7EB',
                    color: status === opt.value ? '#DC2626' : '#6B7280',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Category</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full text-sm rounded-lg px-3 py-2 border"
              style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Assigned day + time (row) */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Assigned day</p>
              <input
                type="date"
                value={assignedDay}
                onChange={(e) => setAssignedDay(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 border"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Time</p>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 border"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
              />
            </div>
            <div className="w-24">
              <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Duration</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-full text-sm rounded-lg px-2 py-2 border text-center"
                  style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827', outline: 'none' }}
                />
                <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>m</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: '#DC2626', background: '#FEF2F2' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280', background: '#FFFFFF' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-60"
            style={{ background: '#EF4444', color: '#FFFFFF' }}
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
