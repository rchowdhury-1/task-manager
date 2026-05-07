import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import api from '../../api/axios';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import {
  Task, CATEGORY_COLORS, PRIORITY_COLORS, CATEGORY_LABELS,
} from '../../types/personalOS';

const STATUS_COLUMNS = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'this_week',  label: 'This Week' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',       label: 'Done' },
] as const;

type Status = typeof STATUS_COLUMNS[number]['id'];

const CATEGORY_FILTERS = ['all', 'career', 'lms', 'freelance', 'learning', 'uber', 'faith'] as const;

function TaskCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { setActiveTask } = usePersonalOS();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const catColor = CATEGORY_COLORS[task.category] || '#94a3b8';
  const priColor = PRIORITY_COLORS[task.priority] || '#94a3b8';

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={{
        ...style,
        background: 'var(--bg-2)',
        borderColor: priColor + '44',
        borderLeftWidth: '3px',
        borderLeftColor: priColor,
      }}
      {...(!overlay ? { ...attributes, ...listeners } : {})}
      onClick={(e) => { e.stopPropagation(); setActiveTask(task.id); }}
      className="rounded-lg border p-3 mb-2 cursor-pointer hover:border-opacity-60 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>{task.title}</p>
        <span
          className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
          style={{ background: catColor + '22', color: catColor }}
        >
          {CATEGORY_LABELS[task.category]}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-xs font-semibold" style={{ color: priColor }}>P{task.priority}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.duration_minutes}min</span>
        {task.assigned_day && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(task.assigned_day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({ status, label, tasks }: { status: Status; label: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });

  return (
    <div className="flex flex-col min-w-64 w-64 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{label}</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--primary)' }}
        >
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 rounded-xl p-2 min-h-48 transition-colors"
        style={{
          background: isOver ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
          border: '1px solid',
          borderColor: isOver ? 'var(--primary)' : 'var(--border)',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { tasks, updateTask } = usePersonalOS();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filteredTasks = filterCategory === 'all'
    ? tasks
    : tasks.filter((t) => t.category === filterCategory);

  const getColumnTasks = (status: Status) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.priority - b.priority);

  const onDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = String(over.id);
    const newStatus = overId.startsWith('col-') ? overId.replace('col-', '') as Status : null;
    if (!newStatus) return;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) {
      updateTask(task.id, { status: newStatus });
    }
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const overId = String(over.id);
    const newStatus = overId.startsWith('col-')
      ? (overId.replace('col-', '') as Status)
      : tasks.find((t) => t.id === overId)?.status;

    if (!newStatus) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch {
      // Revert on failure
      updateTask(task.id, { status: task.status });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize"
            style={{
              background: filterCategory === cat ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
              color: filterCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: filterCategory === cat ? 'rgba(16,185,129,0.4)' : 'var(--border)',
            }}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {filteredTasks.length} tasks
        </span>
      </div>

      {/* Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 px-4 pb-4 overflow-x-auto flex-1">
          {STATUS_COLUMNS.map(({ id, label }) => (
            <Column key={id} status={id} label={label} tasks={getColumnTasks(id)} />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
