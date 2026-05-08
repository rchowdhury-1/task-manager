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

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<number, { border: string; bg: string }> = {
  1: { border: '#E24B4A', bg: '#2D1F1F' },
  2: { border: '#EF9F27', bg: '#2D2419' },
  3: { border: '#639922', bg: '#1E2A14' },
};

const CATEGORY_BADGE: Record<string, string> = {
  career:   'bg-[#1A2F4A] text-[#60A5FA]',
  lms:      'bg-[#1A3A1A] text-[#4ADE80]',
  freelance:'bg-[#3A2A0A] text-[#FCD34D]',
  learning: 'bg-[#2A1A3A] text-[#C084FC]',
  uber:     'bg-[#3A1A0A] text-[#FB923C]',
  faith:    'bg-[#2A1A2A] text-[#F472B6]',
};

const PRIORITY_DOT: Record<number, string> = {
  1: '#E24B4A',
  2: '#EF9F27',
  3: '#639922',
};

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'this_week',  label: 'This Week' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',       label: 'Done' },
] as const;

type Status = 'backlog' | 'this_week' | 'in_progress' | 'done';

const CATEGORY_FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'career',    label: 'Career' },
  { id: 'lms',       label: 'LMS' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'learning',  label: 'Learning' },
  { id: 'uber',      label: 'Uber' },
] as const;

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { setActiveTask } = usePersonalOS();
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3];
  const catCls = CATEGORY_BADGE[task.category] ?? 'bg-[#2A2A2A] text-[#98989F]';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={{ ...style, background: ps.bg, borderLeftColor: ps.border }}
      {...(!overlay ? { ...attributes, ...listeners } : {})}
      onClick={() => setActiveTask(task.id)}
      className="rounded-lg p-3 mb-2 border-l-2 cursor-pointer transition-colors"
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#48484A'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ps.bg; }}
    >
      {/* Row 1: title + priority dot */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-[#F5F5F7] leading-snug flex-1">{task.title}</p>
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1"
          style={{ background: PRIORITY_DOT[task.priority] ?? '#48484A' }}
        />
      </div>
      {/* Row 2: category badge + duration */}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catCls}`}>
          {CATEGORY_LABELS[task.category]}
        </span>
        <span className="text-[10px] text-[#98989F]">{task.duration_minutes}m</span>
      </div>
      {/* Row 3: assigned day */}
      {task.assigned_day && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] text-[#98989F]">📅 {task.assigned_day}</span>
        </div>
      )}
    </div>
  );
}

// ─── AddTaskForm ──────────────────────────────────────────────────────────────

function AddTaskForm({ status, onClose }: { status: Status; onClose: () => void }) {
  const { refetch } = usePersonalOS();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Task['category']>('career');

  const handleSave = async () => {
    if (!title.trim()) { onClose(); return; }
    try {
      await api.post('/tasks', {
        title: title.trim(),
        category,
        status,
        priority: 2,
        duration_minutes: 60,
      });
      await refetch();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create task';
      toast.error(msg);
    }
  };

  return (
    <div className="mt-2 rounded-lg bg-[#1C1C1E] border border-[#48484A] p-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Task title…"
        className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder-[#98989F] outline-none mb-2"
      />
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value as Task['category'])}
          className="text-xs bg-[#3A3A3C] border border-[#48484A] rounded px-2 py-1 text-[#F5F5F7] outline-none flex-1"
        >
          {(['career','lms','freelance','learning','uber','faith'] as Task['category'][]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="text-xs px-2 py-1 rounded bg-[#C084FC] text-black font-medium"
        >
          Add
        </button>
        <button onClick={onClose} className="text-xs text-[#98989F] hover:text-[#F5F5F7]">✕</button>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col, tasks, addingTo, setAddingTo,
}: {
  col: { id: Status; label: string };
  tasks: Task[];
  addingTo: Status | null;
  setAddingTo: (s: Status | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });

  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F5F5F7]">{col.label}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#3A3A3C] text-[#98989F] font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-xl p-3 min-h-[500px] flex flex-col transition-colors"
        style={{
          background: isOver ? 'rgba(96,165,250,0.05)' : '#2C2C2E',
          border: `1px solid ${isOver ? '#60A5FA' : '#48484A'}`,
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#98989F]">No tasks</p>
          </div>
        )}

        {/* Add task */}
        {addingTo === col.id ? (
          <AddTaskForm status={col.id} onClose={() => setAddingTo(null)} />
        ) : (
          <button
            onClick={() => setAddingTo(col.id)}
            className="mt-2 w-full py-2 text-sm text-[#98989F] hover:text-[#F5F5F7] border border-dashed border-[#48484A] hover:border-[#98989F] rounded-lg transition-colors"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { tasks, updateTask } = usePersonalOS();
  const [filter, setFilter] = useState('all');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [addingTo, setAddingTo] = useState<Status | null>(null);

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
    if (!newStatus) return;

    try {
      await api.patch(`/tasks/${draggedTask.id}`, { status: newStatus });
    } catch {
      updateTask(draggedTask.id, { status: originalStatus });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
        {CATEGORY_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={{
              background: filter === id ? '#3A3A3C' : 'transparent',
              color: filter === id ? '#F5F5F7' : '#98989F',
              borderColor: '#48484A',
            }}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#98989F]">{filteredTasks.length} tasks</span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 px-4 pb-4 overflow-x-auto flex-1">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              tasks={getColTasks(col.id)}
              addingTo={addingTo}
              setAddingTo={setAddingTo}
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
    </div>
  );
}
