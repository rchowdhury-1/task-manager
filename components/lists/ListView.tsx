'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveTask } from '@/lib/state/activeTask';
import { useCategories, useCreateTask, useUpdateTask } from '@/lib/api/hooks';
import { SMART_LISTS, type SmartListKey } from '@/lib/lists/smartLists';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import type { Task, Category, CategoryRecord } from '@/lib/types';

type FilterMode = 'open' | 'done' | 'all';
type SortMode = 'date' | 'priority' | 'created';

interface ListViewProps {
  categoryId: string | null;
  smartList: SmartListKey | null;
  tasks: Task[];
}

// ─── List Item ─────────────────────────────────────────────────────────────

function ListItem({ task, onToggle, onClick }: { task: Task; onToggle: () => void; onClick: () => void }) {
  const isDone = task.status === 'done';
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const dateLabel = task.assignedDay === todayStr ? 'Today' :
    task.assignedDay ?? '—';

  return (
    <div
      onClick={onClick}
      className={`
        grid grid-cols-[auto_1fr_auto_auto] gap-3 md:gap-3.5 items-center
        px-4 md:px-[22px] py-3.5
        bg-surface border-b border-border last:border-b-0
        cursor-pointer hover:bg-surface-raised transition-colors
        ${isDone ? 'opacity-50' : ''}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`
          w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0
          ${isDone ? 'bg-accent' : 'border-[1.5px] border-ink-4 hover:border-accent'}
          transition-colors
        `}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + note */}
      <div className="flex flex-col gap-1 min-w-0">
        <span className={`text-[14.5px] font-medium tracking-tight text-primary truncate ${isDone ? 'line-through' : ''}`}>
          {task.title}
        </span>
        {task.description && (
          <span className="text-[12.5px] text-tertiary truncate">{task.description}</span>
        )}
      </div>

      {/* Est + Priority */}
      <div className="flex items-center gap-2.5">
        {task.durationMinutes > 0 && (
          <span className="font-mono text-[11px] text-tertiary">
            {task.durationMinutes >= 60 ? `${Math.floor(task.durationMinutes / 60)}h` : `${task.durationMinutes}m`}
          </span>
        )}
        {task.priority <= 2 && (
          <span className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded ${
            task.priority === 1 ? 'bg-tag-rose-bg text-tag-rose' : 'bg-tag-amber-bg text-tag-amber'
          }`}>
            P{task.priority}
          </span>
        )}
      </div>

      {/* Date */}
      <span className={`font-mono text-[11.5px] whitespace-nowrap ${
        dateLabel === 'Today' ? 'text-accent' : 'text-tertiary'
      }`}>
        {dateLabel}
      </span>
    </div>
  );
}

// ─── Section Group ─────────────────────────────────────────────────────────

function ListSection({ title, tasks, count, onToggle, onClick }: {
  title: string;
  tasks: Task[];
  count: number;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}) {
  return (
    <motion.div variants={fadeInUp} className="mt-6 md:mt-7">
      <div className="flex justify-between items-center px-4 md:px-[22px] pb-2.5">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary">
          {title}
        </span>
        <span className="font-mono text-[10.5px] text-tertiary">{count}</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {tasks.map(task => (
          <ListItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onClick={() => onClick(task.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyList({ name, onAdd }: { name: string; onAdd?: () => void }) {
  return (
    <div className="border border-dashed border-border-strong rounded-2xl px-8 py-14 md:py-16 text-center mt-6">
      <p className="font-display italic text-[22px] md:text-[28px] text-secondary leading-snug max-w-[460px] mx-auto mb-3.5">
        Nothing here yet. <span className="text-accent">Start small.</span>
      </p>
      <p className="text-[13px] md:text-[14px] text-tertiary max-w-[420px] mx-auto mb-6">
        Add the next thing on your mind for <strong className="text-primary">{name}</strong>.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 h-9 bg-accent text-white rounded-lg text-[13px] font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} /> Add to {name}
        </button>
      )}
    </div>
  );
}

// ─── Inline Add Form ───────────────────────────────────────────────────────

function InlineAddForm({ category, onClose }: { category: Category; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      {
        title: trimmed,
        category,
        priority: 2,
        status: 'backlog',
        duration_minutes: 60,
        next_steps: [],
      },
      {
        onSuccess: () => { setTitle(''); toast.success('Task created'); },
        onError: () => toast.error("Couldn't create task"),
      },
    );
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-3 mt-4 flex items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
        placeholder="What needs doing?"
        className="flex-1 text-sm bg-transparent text-primary placeholder:text-tertiary outline-none"
      />
      <button onClick={submit} disabled={!title.trim()} className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md disabled:opacity-40">
        Add
      </button>
      <button onClick={onClose} className="text-xs text-tertiary hover:text-primary">Cancel</button>
    </div>
  );
}

// ─── Main ListView ─────────────────────────────────────────────────────────

export function ListView({ categoryId, smartList, tasks }: ListViewProps) {
  const { data: categories } = useCategories();
  const updateTask = useUpdateTask();
  const { setActiveTaskId } = useActiveTask();
  const [filter, setFilter] = useState<FilterMode>('open');
  const [sort, setSort] = useState<SortMode>('date');
  const [showAddForm, setShowAddForm] = useState(false);

  const activeCategory = categories?.find(c => c.id === categoryId);

  // Determine which tasks to show
  const filteredTasks = useMemo(() => {
    let pool: Task[];

    if (smartList) {
      pool = tasks.filter(SMART_LISTS[smartList].filter);
    } else if (activeCategory) {
      pool = tasks.filter(t => t.category === activeCategory.slug);
    } else {
      pool = [];
    }

    // Apply filter
    if (filter === 'open') pool = pool.filter(t => t.status !== 'done');
    else if (filter === 'done') pool = pool.filter(t => t.status === 'done');

    // Apply sort
    pool.sort((a, b) => {
      if (sort === 'priority') return a.priority - b.priority;
      if (sort === 'date') {
        if (a.assignedDay && b.assignedDay) return a.assignedDay.localeCompare(b.assignedDay);
        if (a.assignedDay) return -1;
        if (b.assignedDay) return 1;
        return 0;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return pool;
  }, [tasks, smartList, activeCategory, filter, sort]);

  // Group tasks into sections
  const sections = useMemo(() => {
    if (smartList) {
      // Group by category
      const groups: Record<string, Task[]> = {};
      filteredTasks.forEach(t => {
        const key = t.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([cat, items]) => ({
        title: categories?.find(c => c.slug === cat)?.label ?? cat,
        tasks: items,
      }));
    }

    // Category view: group by status section
    const thisWeek = filteredTasks.filter(t => t.status === 'this_week' || t.status === 'in_progress');
    const backlog = filteredTasks.filter(t => t.status === 'backlog');
    const done = filteredTasks.filter(t => t.status === 'done');

    const result = [];
    if (thisWeek.length > 0) result.push({ title: 'This Week', tasks: thisWeek });
    if (backlog.length > 0) result.push({ title: 'Backlog', tasks: backlog });
    if (done.length > 0) result.push({ title: 'Done', tasks: done });
    return result;
  }, [filteredTasks, smartList, categories]);

  const handleToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'backlog' : 'done';
    updateTask.mutate({ id: taskId, patch: { status: newStatus } });
  };

  const title = smartList ? SMART_LISTS[smartList].label : activeCategory?.label ?? 'Lists';
  const openCount = smartList
    ? tasks.filter(SMART_LISTS[smartList].filter).length
    : tasks.filter(t => activeCategory && t.category === activeCategory.slug && t.status !== 'done').length;

  return (
    <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="max-w-[880px]">
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-7">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] uppercase text-tertiary mb-2">
          {activeCategory?.colour && (
            <span className="w-2 h-2 rounded-sm" style={{ background: `var(--color-tag-${activeCategory.colour})` }} />
          )}
          <span>List · {openCount} open</span>
        </div>
        <h1 className="text-[32px] md:text-[44px] font-semibold leading-[1.02] tracking-display text-primary">
          {title}
        </h1>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        variants={fadeInUp}
        className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface border border-border rounded-[10px] mb-4"
      >
        {/* Filter pills */}
        <div className="flex gap-1.5">
          {(['open', 'done', 'all'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[12.5px] font-medium capitalize transition-colors ${
                filter === f ? 'bg-surface-raised text-primary' : 'text-secondary hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort + Add */}
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
            className="text-[12.5px] text-secondary bg-transparent border border-border rounded-md px-2 py-1 outline-none"
          >
            <option value="date">Sort: Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Created</option>
          </select>

          {!smartList && activeCategory && (
            <button
              onClick={() => setShowAddForm(true)}
              className="h-[30px] px-3 bg-accent text-white rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-accent-hover transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>
      </motion.div>

      {/* Inline add form */}
      {showAddForm && activeCategory && (
        <InlineAddForm
          category={activeCategory.slug as Category}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Sections */}
      {sections.length === 0 ? (
        <EmptyList
          name={title}
          onAdd={!smartList && activeCategory ? () => setShowAddForm(true) : undefined}
        />
      ) : (
        <motion.div variants={staggerChildren}>
          {sections.map(s => (
            <ListSection
              key={s.title}
              title={s.title}
              tasks={s.tasks}
              count={s.tasks.length}
              onToggle={handleToggle}
              onClick={(id) => setActiveTaskId(id)}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
