import { ReactNode, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { CaldavStatus } from '../../types/personalOS';
import ClaudeBar from './ClaudeBar';

const TaskDetailPanel = lazy(() => import('./TaskDetailPanel'));

// ─── CalDAV status dot ────────────────────────────────────────────────────────

function CaldavDot({ status }: { status: CaldavStatus }) {
  const config: Record<CaldavStatus, { color: string; label: string }> = {
    synced:   { color: '#4ADE80', label: 'Synced' },
    pending:  { color: '#EF9F27', label: 'Syncing' },
    error:    { color: '#E24B4A', label: 'Sync error' },
    disabled: { color: '#EF9F27', label: 'Not configured' },
  };
  const { color, label } = config[status] ?? config.disabled;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const { tasks, habits, recurringTasks } = usePersonalOS();
  const today = new Date().toISOString().split('T')[0];

  const p1Count = tasks.filter(t => t.priority === 1 && t.status !== 'done').length;
  const activeCount = tasks.filter(t => t.status === 'this_week' || t.status === 'in_progress').length;
  const activeHabits = habits.filter(h => h.active);
  const doneToday = activeHabits.filter(h => h.completions.includes(today)).length;
  const uberTask = recurringTasks.find(r => r.active && r.category === 'uber');
  const uberTime = uberTask?.scheduled_time
    ? formatTime(uberTask.scheduled_time)
    : '9pm';

  const stats = [
    { label: 'P1 Urgent', value: p1Count.toString(), color: '#FF6B6B' },
    { label: 'This Week', value: activeCount.toString(), color: '#60A5FA' },
    { label: 'Habits', value: `${doneToday}/${activeHabits.length}`, color: '#4ADE80' },
    { label: 'Uber starts', value: uberTime, color: '#FB923C' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-[#48484A]">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-[#2C2C2E] rounded-xl p-3">
          <p className="text-[10px] text-[#98989F] uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-semibold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, '0')}${period}`;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: 'Week',   path: '/os/week' },
  { label: 'Boards', path: '/os/boards' },
  { label: 'Today',  path: '/os/today' },
];

export default function PersonalOSLayout({ children }: { children: ReactNode }) {
  const { caldavStatus, activeTaskId } = usePersonalOS();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-[#1C1C1E] overflow-hidden">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-[#1C1C1E] border-b border-[#48484A] flex items-center px-4 gap-4">
        {/* Logo */}
        <span className="font-medium text-[#F5F5F7] text-sm shrink-0">Personal OS</span>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {NAV_TABS.map(({ label, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? '#3A3A3C' : 'transparent',
                  color: active ? '#F5F5F7' : '#98989F',
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* CalDAV dot */}
        <div className="shrink-0">
          <CaldavDot status={caldavStatus} />
        </div>
      </header>

      {/* Scrollable content area */}
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
    </div>
  );
}
