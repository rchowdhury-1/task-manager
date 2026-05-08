import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Task, CATEGORY_LABELS } from '../../types/personalOS';
import TaskModal from './TaskModal';

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { border: string; bg: string }> = {
  1: { border: '#EF4444', bg: '#FEF2F2' },
  2: { border: '#F59E0B', bg: '#FFFBEB' },
  3: { border: '#10B981', bg: '#ECFDF5' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-blue-50 text-blue-600',
  lms:      'bg-green-50 text-green-600',
  freelance:'bg-yellow-50 text-yellow-700',
  learning: 'bg-purple-50 text-purple-600',
  uber:     'bg-orange-50 text-orange-600',
  faith:    'bg-pink-50 text-pink-600',
};

const PRIORITY_DOT: Record<number, string> = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#10B981',
};

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'backlog',      label: 'Backlog' },
  { id: 'this_week',   label: 'This Week' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',        label: 'Done' },
] as const;

type Status = 'backlog' | 'this_week' | 'in_progress' | 'done';

const CATEGORY_FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'career',    label: 'Career' },
  { id: 'lms',       label: 'LMS' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'learning',  label: 'Learning' },
  { id: 'uber',      label: 'Uber' },
  { id: 'faith',     label: 'Faith' },
] as const;

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { setActiveTask, updateTask } = usePersonalOS();
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3];
  const catCls = CATEGORY_BADGE[task.category] ?? 'bg-gray-50 text-gray-500';
  const isDone = task.status === 'done';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: Status = isDone ? 'in_progress' : 'done';
    updateTask(task.id, { status: newStatus });
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch {
      updateTask(task.id, { status: task.status });
      toast.error('Failed to update task', {
        style: { background: '#fff', color: '#111827', border: '1px solid #FECACA' },
      });
    }
  };

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={{
        ...style,
        background: isDone ? '#F0FDF4' : ps.bg,
        borderLeftColor: isDone ? '#10B981' : ps.border,
      }}
      {...(!overlay ? { ...attributes, ...listeners } : {})}
      onClick={() => setActiveTask(task.id)}
      className="rounded-xl p-3 mb-2 border-l-2 border border-gray-100 cursor-pointer transition-colors group shadow-sm hover:shadow-md"
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isDone ? '#F0FDF4' : ps.bg; }}
    >
      {/* Row 1: done checkbox + title + urgency badge + priority dot */}
      <div className="flex items-start gap-2 mb-1.5">
        <button
          onClick={handleDone}
          className="w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold transition-all"
          style={{
            background: isDone ? '#10B981' : 'transparent',
            borderColor: isDone ? '#10B981' : '#D1D5DB',
            color: '#fff',
          }}
        >
          {isDone ? '✓' : ''}
        </button>
        <p
          className="text-sm font-medium leading-snug flex-1"
          style={{
            color: isDone ? '#9CA3AF' : '#111827',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        {task.priority === 1 && !isDone && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide"
            style={{ background: '#EF4444', color: '#fff' }}>
            URGENT
          </span>
        )}
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1"
          style={{ background: PRIORITY_DOT[task.priority] ?? '#D1D5DB' }}
        />
      </div>

      {/* Row 2: category badge + duration + steps */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
          {CATEGORY_LABELS[task.category]}
        </span>
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{task.duration_minutes}m</span>
        {task.next_steps.length > 0 && (
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
            {task.next_steps.filter(s => s.done).length}/{task.next_steps.length} steps
          </span>
        )}
      </div>

      {/* Row 3: assigned day */}
      {task.assigned_day && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px]" style={{ color: '#6B7280' }}>
            📅 {new Date(task.assigned_day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col, tasks, onAddTask,
}: {
  col: { id: Status; label: string };
  tasks: Task[];
  onAddTask: (status: Status) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });

  return (
    <div className="flex flex-col shrink-0 snap-start" style={{ minWidth: 'min(260px, 85vw)', width: 'min(260px, 85vw)' }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>{col.label}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-2xl p-3 min-h-[500px] flex flex-col transition-colors"
        style={{
          background: isOver ? '#FEF2F2' : '#F9FAFB',
          border: `1.5px solid ${isOver ? '#EF4444' : '#E5E7EB'}`,
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs" style={{ color: '#D1D5DB' }}>No tasks</p>
          </div>
        )}

        <button
          onClick={() => onAddTask(col.id)}
          className="mt-2 w-full py-2 text-sm rounded-xl transition-colors border border-dashed"
          style={{ color: '#9CA3AF', borderColor: '#E5E7EB' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF4444';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
          }}
        >
          + Add task
        </button>
      </div>
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { tasks, updateTask } = usePersonalOS();
  const [filter, setFilter] = useState('all');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [modalStatus, setModalStatus] = useState<Status | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.category === filter);

  const getColTasks = (status: Status) =>
    filteredTasks.filter(t => t.status === status).sort((a, b) => a.priority - b.priority);

  const onDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === String(active.id));
    if (task) setDraggedTask({ ...task });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = String(over.id);
    const newStatus: Status | undefined = overId.startsWith('col-')
      ? (overId.replace('col-', '') as Status)
      : tasks.find(t => t.id === overId)?.status;
    if (!newStatus) return;
    const task = tasks.find(t => t.id === String(active.id));
    if (task && task.status !== newStatus) updateTask(task.id, { status: newStatus });
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!draggedTask) { setDraggedTask(null); return; }
    const originalStatus = draggedTask.status;
    setDraggedTask(null);
    if (!over) return;

    const overId = String(over.id);
    const newStatus: Status | undefined = overId.startsWith('col-')
      ? (overId.replace('col-', '') as Status)
      : tasks.find(t => t.id === overId)?.status;
    if (!newStatus || newStatus === originalStatus) return;

    try {
      await api.patch(`/tasks/${draggedTask.id}`, { status: newStatus });
    } catch {
      updateTask(draggedTask.id, { status: originalStatus });
      toast.error('Failed to move task', {
        style: { background: '#fff', color: '#111827', border: '1px solid #FECACA' },
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-3 flex-wrap border-b" style={{ borderColor: '#F3F4F6' }}>
        {CATEGORY_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={{
              background: filter === id ? '#FEF2F2' : 'transparent',
              color: filter === id ? '#DC2626' : '#6B7280',
              borderColor: filter === id ? '#EF4444' : '#E5E7EB',
            }}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: '#9CA3AF' }}>{filteredTasks.length} tasks</span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 px-4 pb-4 overflow-x-auto flex-1 pt-4 snap-x snap-mandatory sm:snap-none scrollbar-none">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              tasks={getColTasks(col.id)}
              onAddTask={(s) => setModalStatus(s)}
            />
          ))}
        </div>

        <DragOverlay>
          {draggedTask && (
            <div className="rotate-1 opacity-90">
              <TaskCard task={draggedTask} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task creation modal */}
      <TaskModal
        open={modalStatus !== null}
        onClose={() => setModalStatus(null)}
        defaultStatus={modalStatus ?? 'backlog'}
      />
    </div>
  );
}
