import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav
      className="sticky top-0 z-40 border-b"
      style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              T
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text)' }}>TaskFlow</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
                style={{ background: user?.avatar_color || 'var(--primary)' }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm hidden sm:block" style={{ color: 'var(--text)' }}>{user?.name}</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl border overflow-hidden"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                  style={{ color: '#ef4444' }}
                >
                  {loggingOut ? 'Logging out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
