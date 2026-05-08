import { ReactNode, Suspense, lazy, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { CaldavStatus } from '../../types/personalOS';
import ClaudeBar from './ClaudeBar';
import TaskModal from './TaskModal';

const TaskDetailPanel = lazy(() => import('./TaskDetailPanel'));

// ─── CalDAV status dot ────────────────────────────────────────────────────────

function CaldavDot({ status }: { status: CaldavStatus }) {
  const config: Record<CaldavStatus, { color: string; label: string }> = {
    synced:         { color: '#10B981', label: 'Synced' },
    pending:        { color: '#F59E0B', label: 'Syncing' },
    error:          { color: '#EF4444', label: 'Sync error' },
    disabled:       { color: '#D1D5DB', label: 'Not configured' },
    not_configured: { color: '#D1D5DB', label: 'Not configured' },
  };
  const { color, label } = config[status] ?? config.disabled;
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const { tasks, habits } = usePersonalOS();
  const today = new Date().toISOString().split('T')[0];

  const p1Count      = tasks.filter(t => t.priority === 1 && t.status !== 'done').length;
  const activeCount  = tasks.filter(t => t.status === 'this_week' || t.status === 'in_progress').length;
  const activeHabits = habits.filter(h => h.active);
  const doneToday    = activeHabits.filter(h => h.completions.includes(today)).length;
  const doneCount    = tasks.filter(t => t.status === 'done').length;

  const stats = [
    { label: 'P1 Urgent', value: p1Count.toString(),                    color: '#EF4444', bg: '#FEF2F2' },
    { label: 'This Week', value: activeCount.toString(),                 color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Habits',    value: `${doneToday}/${activeHabits.length}`, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Done',      value: doneCount.toString(),                   color: '#6B7280', bg: '#F9FAFB' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-4 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
      {stats.map(({ label, value, color, bg }) => (
        <div key={label} className="rounded-xl p-3 border" style={{ background: bg, borderColor: '#F3F4F6' }}>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>{label}</p>
          <p className="text-lg sm:text-xl font-semibold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: 'Week',     path: '/os/week' },
  { label: 'Boards',   path: '/os/boards' },
  { label: 'Today',    path: '/os/today' },
  { label: 'Stats',    path: '/os/stats' },
  { label: 'Settings', path: '/os/settings' },
];

export default function PersonalOSLayout({ children }: { children: ReactNode }) {
  const { caldavStatus, activeTaskId } = usePersonalOS();
  const navigate = useNavigate();
  const location = useLocation();
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#FAFAF9' }}>
      {/* Fixed header */}
      <header
        className="fixed top-0 left-0 right-0 z-30 h-14 border-b flex items-center px-3 sm:px-4 gap-2 sm:gap-4"
        style={{ background: '#FFFFFF', borderColor: '#F3F4F6' }}
      >
        {/* Logo — hidden on very small screens to save space */}
        <span className="hidden sm:block font-semibold text-sm shrink-0" style={{ color: '#111827' }}>Personal OS</span>

        {/* Tab nav — horizontally scrollable on mobile */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {NAV_TABS.map(({ label, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
                style={{
                  background: active ? '#FEF2F2' : 'transparent',
                  color: active ? '#EF4444' : '#6B7280',
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* New Task button */}
          <button
            onClick={() => setNewTaskOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: '#EF4444', color: '#fff' }}
          >
            <span className="hidden sm:inline">+ New Task</span>
            <span className="sm:hidden">+</span>
          </button>
          {/* CalDAV dot */}
          <CaldavDot status={caldavStatus} />
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 pb-24">
        <StatsBar />
        {children}
      </main>

      {/* Fixed Claude bar */}
      <ClaudeBar />

      {/* Task detail panel (lazy) */}
      {activeTaskId && (
        <Suspense fallback={null}>
          <TaskDetailPanel />
        </Suspense>
      )}

      {/* Global new task modal */}
      <TaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  );
}
