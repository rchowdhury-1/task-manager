import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { CaldavStatus } from '../../types/personalOS';
import ClaudeBar from './ClaudeBar';

const CaldavDot = ({ status }: { status: CaldavStatus }) => {
  const colors: Record<CaldavStatus, string> = {
    synced: '#10b981',
    pending: '#f59e0b',
    error: '#ef4444',
    disabled: '#64748b',
  };
  const labels: Record<CaldavStatus, string> = {
    synced: 'iCal synced',
    pending: 'iCal syncing…',
    error: 'iCal sync error',
    disabled: 'iCal disabled',
  };
  return (
    <span title={labels[status]} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: colors[status] }} />
      {labels[status]}
    </span>
  );
};

const NAV_ITEMS = [
  { path: '/os/week',   label: 'Week',   icon: '📅' },
  { path: '/os/boards', label: 'Boards', icon: '📋' },
  { path: '/os/today',  label: 'Today',  icon: '⚡' },
];

export default function PersonalOSLayout({ children }: { children: ReactNode }) {
  const { caldavStatus } = usePersonalOS();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/os/week" className="text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Personal<span style={{ color: 'var(--primary)' }}>OS</span>
          </Link>

          {/* View switcher */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: CalDAV status + settings */}
          <div className="flex items-center gap-4">
            <CaldavDot status={caldavStatus} />
            <Link to="/dashboard" className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ← Boards
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-24">
        {children}
      </main>

      {/* Claude bar — fixed bottom */}
      <ClaudeBar />
    </div>
  );
}
