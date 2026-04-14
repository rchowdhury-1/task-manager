import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { AppLayout } from './components/Layout/AppLayout';
import { BoardView } from './components/Board/BoardView';
import { useSocket } from './hooks/useSocket';

function DashboardPage() {
  const { fetchBoards } = useTaskStore();
  const token = useAuthStore((s) => s.token);

  // Init socket connection
  useSocket();

  useEffect(() => {
    fetchBoards();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout>
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Welcome to TaskFlow</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Create a board from the sidebar to get started, or join an existing one with an invite code.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { fetchBoards } = useTaskStore();

  useSocket(id);

  useEffect(() => {
    fetchBoards();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!id) return <Navigate to="/" replace />;

  return (
    <AppLayout currentBoardId={id}>
      <BoardView boardId={id} />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#1e293b' } },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/board/:id"
          element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
