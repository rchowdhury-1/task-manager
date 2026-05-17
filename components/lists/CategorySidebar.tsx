'use client';
import { useState } from 'react';
import { Plus, List, Zap, Calendar, Clock, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/lib/api/hooks';
import { SMART_LISTS, type SmartListKey } from '@/lib/lists/smartLists';
import type { Task, CategoryRecord } from '@/lib/types';

const SMART_LIST_ICONS: Record<SmartListKey, typeof List> = {
  all_open: List,
  priorities: Zap,
  due_this_week: Calendar,
  stale: Clock,
};

const TONE_COLORS: Record<string, { bg: string; text: string }> = {
  blue:   { bg: 'bg-tag-blue-bg',   text: 'text-tag-blue' },
  violet: { bg: 'bg-tag-violet-bg', text: 'text-tag-violet' },
  amber:  { bg: 'bg-tag-amber-bg',  text: 'text-tag-amber' },
  green:  { bg: 'bg-tag-green-bg',  text: 'text-tag-green' },
  slate:  { bg: 'bg-tag-slate-bg',  text: 'text-tag-slate' },
  rose:   { bg: 'bg-tag-rose-bg',   text: 'text-tag-rose' },
};

interface CategorySidebarProps {
  activeCategory: string | null;
  activeSmartList: SmartListKey | null;
  onSelectCategory: (id: string) => void;
  onSelectSmartList: (key: SmartListKey) => void;
  tasks: Task[];
}

export function CategorySidebar({
  activeCategory,
  activeSmartList,
  onSelectCategory,
  onSelectSmartList,
  tasks,
}: CategorySidebarProps) {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColour, setNewColour] = useState('blue');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const openTaskCount = (cat: CategoryRecord) =>
    tasks.filter(t => t.category === cat.slug && t.status !== 'done').length;

  const smartListCount = (key: SmartListKey) =>
    tasks.filter(SMART_LISTS[key].filter).length;

  const handleCreate = () => {
    const label = newLabel.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    createCategory.mutate(
      { slug, label, colour: newColour },
      { onSuccess: () => { setNewLabel(''); setShowNewForm(false); } },
    );
  };

  return (
    <aside className="hidden md:flex flex-col gap-1 py-8 pr-4">
      {/* Topics heading */}
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary px-3 pb-2">
        Your lists
      </p>

      {/* Category items */}
      {categories?.map(cat => {
        const isActive = activeCategory === cat.id;
        const tone = TONE_COLORS[cat.colour ?? 'slate'] ?? TONE_COLORS.slate;
        return (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => onSelectCategory(cat.id)}
              className={`
                w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                ${isActive ? 'bg-surface border border-border' : 'hover:bg-surface-raised border border-transparent'}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-6 h-6 rounded-md ${tone.bg} ${tone.text} flex items-center justify-center shrink-0`}>
                  <span className="text-[11px]">
                    {cat.icon === 'briefcase' ? '💼' :
                     cat.icon === 'book' ? '📖' :
                     cat.icon === 'code' ? '💻' :
                     cat.icon === 'layers' ? '📚' :
                     cat.icon === 'truck' ? '🚚' :
                     cat.icon === 'heart' ? '❤️' : '📁'}
                  </span>
                </span>
                <span className={`text-[14px] truncate ${isActive ? 'font-semibold text-primary' : 'font-medium text-primary'}`}>
                  {cat.label}
                </span>
              </div>
              <span className="font-mono text-[11px] text-tertiary shrink-0">
                {openTaskCount(cat)}
              </span>
            </button>

            {/* Hover menu for custom categories */}
            {!cat.isSystem && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === cat.id ? null : cat.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-tertiary hover:text-primary transition-opacity"
              >
                <MoreHorizontal size={14} />
              </button>
            )}

            {/* Dropdown for custom category */}
            {menuOpenId === cat.id && !cat.isSystem && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => { deleteCategory.mutate({ id: cat.id }); setMenuOpenId(null); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-p1 hover:bg-surface-raised flex items-center gap-2"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* New topic button / form */}
      {showNewForm ? (
        <div className="px-3 py-2 space-y-2">
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false); }}
            placeholder="Topic name"
            className="w-full text-sm bg-transparent border border-border rounded-md px-2 py-1.5 text-primary placeholder:text-tertiary outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center gap-1.5">
            {Object.keys(TONE_COLORS).map(tone => (
              <button
                key={tone}
                onClick={() => setNewColour(tone)}
                className={`w-5 h-5 rounded-full ${TONE_COLORS[tone].bg} border-2 ${newColour === tone ? 'border-accent' : 'border-transparent'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="text-xs font-medium text-accent hover:underline">Save</button>
            <button onClick={() => setShowNewForm(false)} className="text-xs text-tertiary hover:text-primary">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="mt-2 mx-3 flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-tertiary border border-dashed border-border-strong rounded-lg hover:text-primary hover:border-border transition-colors"
        >
          <Plus size={13} /> New topic
        </button>
      )}

      {/* Smart lists */}
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary px-3 pt-6 pb-2">
        Smart
      </p>
      {(Object.keys(SMART_LISTS) as SmartListKey[]).map(key => {
        const sl = SMART_LISTS[key];
        const Icon = SMART_LIST_ICONS[key];
        const isActive = activeSmartList === key;
        return (
          <button
            key={key}
            onClick={() => onSelectSmartList(key)}
            className={`
              w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors
              ${isActive ? 'bg-surface border border-border' : 'hover:bg-surface-raised border border-transparent'}
            `}
          >
            <span className="flex items-center gap-2.5 text-[13.5px] text-secondary">
              <Icon size={14} strokeWidth={1.6} />
              {sl.label}
            </span>
            <span className="font-mono text-[11px] text-tertiary">
              {smartListCount(key)}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
