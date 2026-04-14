import { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, user, validateToken } = useAuthStore();
  const [checking, setChecking] = useState(!user && !!token);

  useEffect(() => {
    if (!user && token) {
      validateToken().finally(() => setChecking(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return <Navigate to="/login" replace />;
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
