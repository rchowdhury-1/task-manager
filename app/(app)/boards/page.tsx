// NOTE: Card order within each column is determined by status → priority →
// assignedDay → createdAt (DB ordering). Visual reordering via drag within the
// same column is not persisted — the next refetch will revert to DB order.
// If true manual ordering is needed, add a sort_order/position column in 4d.

'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTasks, useCreateTask, useUpdateTask } from '@/lib/api/hooks';
import { useActiveTask } from '@/lib/state/activeTask';
import { TaskCard } from '@/components/TaskCard';
import { resolveDropTarget } from '@/lib/utils/board';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LayoutGrid, Filter } from 'lucide-react';
import type { Task, Status, Category } from '@/lib/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { id: Status; label: string; dot?: string }[] = [
  { id: 'backlog', label: 'BACKLOG' },
  { id: 'this_week', label: 'THIS WEEK' },
  { id: 'in_progress', label: 'IN PROGRESS', dot: 'bg-green-500' },
  { id: 'done', label: 'DONE' },
];

const ALL_CATEGORIES: Category[] = ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'];
const CATEGORY_LABELS: Record<Category, string> = {
  career: 'Career', lms: 'LMS', freelance: 'Freelance',
  learning: 'Learning', uber: 'Uber', faith: 'Faith',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-surface-raised rounded" />
      <div className="h-8 w-80 bg-surface-raised rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-[500px] bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Draggable Card Wrapper ──────────────────────────────────────────────────

function DraggableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : undefined,
  };

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      onClick={onClick}
      style={style}
      listeners={listeners}
      attributes={attributes}
    />
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BoardsPage() {
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const { setActiveTaskId } = useActiveTask();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<Category>>(new Set());
  const [mobileColIndex, setMobileColIndex] = useState(0);

  const allTasks = tasks ?? [];

  // Categories that actually have tasks
  const presentCategories = useMemo(() =>
    ALL_CATEGORIES.filter(c => allTasks.some(t => t.category === c)),
    [allTasks]
  );

  // Filtered tasks
  const filteredTasks = useMemo(() =>
    filters.size === 0
      ? allTasks
      : allTasks.filter(t => filters.has(t.category)),
    [allTasks, filters]
  );

  // Group by column
  const columns = useMemo(() =>
    COLUMNS.map(col => ({
      ...col,
      tasks: filteredTasks.filter(t => t.status === col.id),
    })),
    [filteredTasks]
  );

  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : undefined;

  // ─── Handlers ────────────────────────────────────────────────────────────

  function openTaskDetail(id: string) {
    setActiveTaskId(id);
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const task = allTasks.find(t => t.id === String(active.id));
    if (!task) return;

    const newStatus = resolveDropTarget(over.id, allTasks);
    if (!newStatus || newStatus === task.status) return;

    updateTask.mutate(
      { id: task.id, patch: { status: newStatus } },
      { onError: () => toast.error("Couldn't move task. Try again.") },
    );
  }

  function toggleFilter(cat: Category) {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function clearFilters() {
    setFilters(new Set());
  }

  function handleCreateInColumn(status: Status, title: string) {
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        category: filters.size === 1 ? [...filters][0] : 'career',
        priority: 2,
        status,
        duration_minutes: 60,
        next_steps: [],
      },
      {
        onSuccess: () => toast.success('Task created'),
        onError: () => toast.error("Couldn't create task."),
      },
    );
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-accent-muted border border-accent rounded-lg p-4 flex items-center gap-3">
        <span className="text-p1 text-sm flex-1">Error: {(error as Error).message}</span>
        <button onClick={() => refetch()} className="text-sm font-medium text-accent hover:underline">
          Retry
        </button>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────

  if (allTasks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-primary">Boards</h1>
        <div className="text-center py-20 space-y-2">
          <LayoutGrid className="w-8 h-8 text-tertiary mx-auto" />
          <p className="text-secondary text-sm">No tasks yet</p>
          <p className="text-tertiary text-xs">Create your first task in any column to get started.</p>
        </div>
      </div>
    );
  }

  const noMatch = allTasks.length > 0 && filteredTasks.length === 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Boards</h1>
        <span className="text-sm text-secondary">
          {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} across {COLUMNS.length} columns
        </span>
      </div>

      {/* Filter bar */}
      {presentCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={clearFilters}
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border transition-colors
              ${filters.size === 0
                ? 'bg-accent-muted text-accent border-accent'
                : 'bg-surface text-secondary border-border hover:border-accent'
              }
            `}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            All
          </button>
          {presentCategories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`
                rounded-full px-3 py-1 text-sm border transition-colors
                ${filters.has(cat)
                  ? 'bg-accent-muted text-accent border-accent'
                  : 'bg-surface text-secondary border-border hover:border-accent'
                }
              `}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* No match */}
      {noMatch ? (
        <div className="text-center py-16 space-y-2">
          <Filter className="w-6 h-6 text-tertiary mx-auto" />
          <p className="text-secondary text-sm">No tasks match this filter</p>
        </div>
      ) : (
        /* Kanban */
        <>
          {/* ── Mobile: Column tabs + single column ── */}
          <div className="md:hidden space-y-3">
            {/* Tab bar */}
            <div className="flex bg-surface-raised rounded-lg p-0.5">
              {COLUMNS.map((col, i) => (
                <button
                  key={col.id}
                  onClick={() => setMobileColIndex(i)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i === mobileColIndex
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary'
                  }`}
                >
                  {col.label}
                  <span className="ml-1 text-[10px] text-tertiary">
                    {columns[i].tasks.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Single column */}
            <MobileColumn
              column={columns[mobileColIndex]}
              onClickTask={openTaskDetail}
              onCreate={(title) => handleCreateInColumn(columns[mobileColIndex].id, title)}
            />
          </div>

          {/* ── Desktop: Full 4-column kanban with DnD ── */}
          <div className="hidden md:block">
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
              collisionDetection={rectIntersection}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {columns.map(col => (
                  <ColumnWithCreate
                    key={col.id}
                    column={col}
                    tasks={col.tasks}
                    onClickTask={openTaskDetail}
                    onCreate={(title) => handleCreateInColumn(col.id, title)}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}

// Mobile column (no DnD, tappable cards)
function MobileColumn({
  column,
  onClickTask,
  onCreate,
}: {
  column: { id: Status; label: string; dot?: string; tasks: Task[] };
  onClickTask: (id: string) => void;
  onCreate: (title: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const submitAdd = () => {
    if (newTitle.trim()) onCreate(newTitle.trim());
    setNewTitle('');
    setAdding(false);
  };

  return (
    <div className="bg-surface rounded-xl p-3 min-h-[300px] flex flex-col">
      {/* Cards */}
      <div className="flex-1 space-y-2">
        {column.tasks.length === 0 && !adding && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-lg">
            <span className="text-sm text-tertiary italic">No tasks</span>
          </div>
        )}
        {column.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onClickTask(task.id)}
          />
        ))}
      </div>

      {/* Add task */}
      {adding ? (
        <form onSubmit={e => { e.preventDefault(); submitAdd(); }} className="mt-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle(''); } }}
            onBlur={submitAdd}
            placeholder="Task title…"
            className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full py-2 text-sm text-tertiary border border-dashed border-border rounded-lg hover:text-accent hover:border-accent transition-colors"
        >
          + Add Task
        </button>
      )}
    </div>
  );
}

// Column with built-in create flow (keeps title state local)
function ColumnWithCreate({
  column,
  tasks,
  onClickTask,
  onCreate,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onClickTask: (id: string) => void;
  onCreate: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const submitAdd = () => {
    if (newTitle.trim()) {
      onCreate(newTitle.trim());
    }
    setNewTitle('');
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-surface rounded-xl p-3 min-h-[500px] flex flex-col
        transition-colors
        ${isOver ? 'ring-2 ring-accent/30' : ''}
      `}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        {column.dot && <span className={`w-2 h-2 rounded-full ${column.dot}`} />}
        <h3 className="text-xs font-semibold text-secondary tracking-wide">
          {column.label}
        </h3>
        <span className="text-[10px] font-medium text-secondary bg-surface-raised rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2">
        {tasks.length === 0 && !adding && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-lg">
            <span className="text-sm text-tertiary italic">Drop tasks here</span>
          </div>
        )}
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            onClick={() => onClickTask(task.id)}
          />
        ))}
      </div>

      {/* Add task */}
      {adding ? (
        <form
          onSubmit={e => { e.preventDefault(); submitAdd(); }}
          className="mt-2"
        >
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
            }}
            onBlur={submitAdd}
            placeholder="Task title…"
            className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full py-2 text-sm text-tertiary border border-dashed border-border rounded-lg hover:text-accent hover:border-accent transition-colors"
        >
          + Add Task
        </button>
      )}
    </div>
  );
}
