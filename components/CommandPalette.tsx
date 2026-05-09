'use client';
import {
  useState, useEffect, useRef, useCallback, KeyboardEvent,
} from 'react';
import {
  Search, Calendar, LayoutGrid, BarChart2, Settings, Sun, LogOut, Clock,
} from 'lucide-react';
import { QuickAddInput, ParsedTask } from './QuickAddInput';

interface Task {
  id: string;
  title: string;
  category: string;
  priority: 1 | 2 | 3;
}

interface CommandPaletteProps {
  recentTasks: Task[];
  onNavigate: (route: string) => void;
  onCreateTask: (parsed: ParsedTask) => void;
  onAction: (action: 'toggle-theme' | 'logout') => void;
}

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  action: () => void;
  section: string;
  keywords: string;
  priority?: number;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F59E0B',
  3: '#10B981',
};

function fuzzy(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < n.length; ni++) {
    const idx = h.indexOf(n[ni], hi);
    if (idx === -1) return false;
    hi = idx + 1;
  }
  return true;
}

export function CommandPalette({
  recentTasks,
  onNavigate,
  onCreateTask,
  onAction,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIdx(0);
  }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  // Build item list
  const navItems: Item[] = [
    { id: 'today',    label: 'Go to Today',    icon: <Calendar size={16} />,   hint: 'T', action: () => { onNavigate('/today');    close(); }, section: 'Navigation', keywords: 'today' },
    { id: 'week',     label: 'Go to Week',     icon: <LayoutGrid size={16} />, hint: 'W', action: () => { onNavigate('/week');     close(); }, section: 'Navigation', keywords: 'week' },
    { id: 'boards',   label: 'Go to Boards',   icon: <LayoutGrid size={16} />, hint: 'B', action: () => { onNavigate('/boards');   close(); }, section: 'Navigation', keywords: 'boards kanban' },
    { id: 'stats',    label: 'Go to Stats',    icon: <BarChart2 size={16} />,  hint: 'S', action: () => { onNavigate('/stats');    close(); }, section: 'Navigation', keywords: 'stats analytics' },
    { id: 'settings', label: 'Go to Settings', icon: <Settings size={16} />,   hint: ',', action: () => { onNavigate('/settings'); close(); }, section: 'Navigation', keywords: 'settings' },
  ];

  const actionItems: Item[] = [
    { id: 'theme',  label: 'Toggle theme', icon: <Sun size={16} />,    action: () => { onAction('toggle-theme'); close(); }, section: 'Actions', keywords: 'theme dark light' },
    { id: 'logout', label: 'Log out',      icon: <LogOut size={16} />, action: () => { onAction('logout');       close(); }, section: 'Actions', keywords: 'logout sign out' },
  ];

  const recentItems: Item[] = recentTasks.map(t => ({
    id: t.id,
    label: t.title,
    icon: <Clock size={16} />,
    action: () => { onNavigate(`/tasks/${t.id}`); close(); },
    section: 'Recent tasks',
    keywords: `${t.title} ${t.category}`,
    priority: t.priority,
  }));

  const allItems = [...navItems, ...actionItems, ...recentItems];
  const filtered = query
    ? allItems.filter(item => fuzzy(`${item.keywords} ${item.label}`, query))
    : allItems;

  // Group by section
  const sections: Record<string, Item[]> = {};
  filtered.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });
  const flatFiltered = Object.values(sections).flat();

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatFiltered[selectedIdx]?.action();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={close}
    >
      <div
        className="
          w-full max-w-[640px] rounded-xl border border-border bg-surface shadow-2xl
          animate-in fade-in slide-in-from-top-4 duration-200
          flex flex-col max-h-[70vh] overflow-hidden
        "
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-tertiary shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKey}
            placeholder="Search commands and tasks…"
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary outline-none"
          />
          <kbd className="text-[11px] text-tertiary border border-border rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Quick add */}
        {!query && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-wide mb-2">
              Quick add
            </p>
            <QuickAddInput
              placeholder="Add task… #career !1 today 1h"
              onSubmit={(parsed) => { onCreateTask(parsed); close(); }}
            />
          </div>
        )}

        {/* Items */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <p className="text-[11px] font-semibold text-tertiary uppercase tracking-wide px-4 py-1.5">
                {section}
              </p>
              {items.map((item) => {
                const globalIdx = flatFiltered.indexOf(item);
                const isSelected = globalIdx === selectedIdx;
                return (
                  <button
                    key={item.id}
                    data-idx={globalIdx}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIdx(globalIdx)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors duration-100
                      ${isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised'}
                    `}
                  >
                    <span className="text-secondary shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm text-primary truncate">{item.label}</span>
                    {item.section === 'Recent tasks' && item.priority && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[item.priority] ?? '#9CA3AF' }}
                      />
                    )}
                    {item.hint && (
                      <kbd className="text-[11px] text-tertiary border border-border rounded px-1.5 py-0.5 shrink-0">
                        {item.hint}
                      </kbd>
                    )}
                    <kbd className="text-[11px] text-tertiary shrink-0">&crarr;</kbd>
                  </button>
                );
              })}
            </div>
          ))}
          {flatFiltered.length === 0 && (
            <p className="text-sm text-tertiary text-center py-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
