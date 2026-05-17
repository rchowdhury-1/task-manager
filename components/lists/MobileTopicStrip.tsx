'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories, useCreateCategory } from '@/lib/api/hooks';
import { SMART_LISTS, type SmartListKey } from '@/lib/lists/smartLists';
import type { Task, CategoryRecord } from '@/lib/types';

const TONE_DOT: Record<string, string> = {
  blue: 'bg-tag-blue', violet: 'bg-tag-violet', amber: 'bg-tag-amber',
  green: 'bg-tag-green', slate: 'bg-tag-slate', rose: 'bg-tag-rose',
};

interface MobileTopicStripProps {
  activeCategory: string | null;
  activeSmartList: SmartListKey | null;
  onSelectCategory: (id: string) => void;
  onSelectSmartList: (key: SmartListKey) => void;
  tasks: Task[];
}

export function MobileTopicStrip({
  activeCategory,
  activeSmartList,
  onSelectCategory,
  onSelectSmartList,
  tasks,
}: MobileTopicStripProps) {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const [mode, setMode] = useState<'topics' | 'smart'>('topics');

  const openCount = (cat: CategoryRecord) =>
    tasks.filter(t => t.category === cat.slug && t.status !== 'done').length;

  const smartCount = (key: SmartListKey) =>
    tasks.filter(SMART_LISTS[key].filter).length;

  return (
    <div className="md:hidden space-y-3">
      {/* Segmented toggle */}
      <div className="px-5">
        <div className="grid grid-cols-2 p-[3px] bg-surface border border-border rounded-lg">
          {(['topics', 'smart'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-1.5 rounded-md text-[12.5px] font-medium capitalize transition-colors ${
                mode === m ? 'bg-page border border-border text-primary' : 'text-secondary'
              }`}
            >
              {m === 'topics' ? 'Your topics' : 'Smart'}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-1">
        {mode === 'topics' ? (
          <>
            {categories?.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`
                    shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-primary text-page'
                      : 'bg-surface border border-border text-primary'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${TONE_DOT[cat.colour ?? 'slate'] ?? 'bg-tag-slate'}`} />
                  {cat.label}
                  <span className={`font-mono text-[10.5px] ${isActive ? 'opacity-60' : 'text-tertiary'}`}>
                    {openCount(cat)}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => {
                const name = prompt('Topic name:');
                if (!name) return;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                createCategory.mutate({ slug, label: name, colour: 'blue' });
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-strong text-[13px] text-tertiary whitespace-nowrap"
            >
              <Plus size={13} /> New
            </button>
          </>
        ) : (
          (Object.keys(SMART_LISTS) as SmartListKey[]).map(key => {
            const isActive = activeSmartList === key;
            return (
              <button
                key={key}
                onClick={() => onSelectSmartList(key)}
                className={`
                  shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors
                  ${isActive
                    ? 'bg-primary text-page'
                    : 'bg-surface border border-border text-primary'
                  }
                `}
              >
                {SMART_LISTS[key].label}
                <span className={`font-mono text-[10.5px] ${isActive ? 'opacity-60' : 'text-tertiary'}`}>
                  {smartCount(key)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
