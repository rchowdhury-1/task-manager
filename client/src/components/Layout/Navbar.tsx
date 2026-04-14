import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../Shared/Avatar';
import toast from 'react-hot-toast';

interface NavbarProps {
  onToggleActivity: () => void;
  showActivity: boolean;
}

export function Navbar({ onToggleActivity, showActivity }: NavbarProps) {
  const currentBoard = useTaskStore((s) => s.currentBoard);
  const activeUsers = useSocketStore((s) => s.activeUsers);
  const connected = useSocketStore((s) => s.connected);
  const currentUser = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const copyInviteCode = async () => {
    if (!currentBoard?.invite_code) return;
    await navigator.clipboard.writeText(currentBoard.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Include current user in active display
  const allActiveUsers = currentUser
    ? [
        { id: currentUser.id, displayName: currentUser.display_name, avatarColor: currentUser.avatar_color },
        ...activeUsers.filter((u) => u.id !== currentUser.id),
      ]
    : activeUsers;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">
      <div className="flex items-center gap-4">
        {currentBoard ? (
          <>
            <h1 className="text-slate-100 font-semibold text-base truncate max-w-xs">
              {currentBoard.name}
            </h1>
            {/* Invite code */}
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
              title="Copy invite code"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {currentBoard.invite_code}
              {copied && <span className="text-emerald-400">✓</span>}
            </button>
          </>
        ) : (
          <h1 className="text-slate-100 font-semibold text-base">TaskFlow</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
          <span className="text-xs text-slate-500">{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Active users */}
        {allActiveUsers.length > 0 && (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {allActiveUsers.slice(0, 5).map((u) => (
                <Avatar
                  key={u.id}
                  name={u.displayName}
                  color={u.avatarColor}
                  size="xs"
                  tooltip
                />
              ))}
              {allActiveUsers.length > 5 && (
                <div className="w-5 h-5 rounded-full bg-slate-700 ring-2 ring-slate-800 flex items-center justify-center text-[9px] text-slate-300 font-medium">
                  +{allActiveUsers.length - 5}
                </div>
              )}
            </div>
            <span className="ml-2 text-xs text-slate-500">{allActiveUsers.length} online</span>
          </div>
        )}

        {/* Activity feed toggle */}
        <button
          onClick={onToggleActivity}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
            showActivity
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Activity
        </button>
      </div>
    </header>
  );
}
