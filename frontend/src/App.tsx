import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PersonalOSPage from './pages/PersonalOS/PersonalOSPage';
import BoardsPage from './pages/PersonalOS/BoardsPage';
import TodayPage from './pages/PersonalOS/TodayPage';
import SettingsPage from './pages/PersonalOS/SettingsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C1C1E]">
        <div className="w-6 h-6 border-2 border-t-transparent border-[#C084FC] rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/os/week" replace /> : <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/os" element={<Navigate to="/os/week" replace />} />
      <Route path="/os/week" element={<ProtectedRoute><PersonalOSPage /></ProtectedRoute>} />
      <Route path="/os/boards" element={<ProtectedRoute><BoardsPage /></ProtectedRoute>} />
      <Route path="/os/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
      <Route path="/os/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Catch-all → week view for authenticated, login for guests */}
      <Route path="*" element={<Navigate to="/os/week" replace />} />
    </Routes>
  );
}
