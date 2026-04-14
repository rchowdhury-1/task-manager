import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { Board } from '../../types';
import { Modal } from '../Shared/Modal';
import { Button } from '../Shared/Button';

interface SidebarProps {
  onBoardSelect: (board: Board) => void;
  selectedBoardId?: string;
}

export function Sidebar({ onBoardSelect, selectedBoardId }: SidebarProps) {
  const navigate = useNavigate();
  const { boards, createBoard, joinBoard, isLoadingBoards } = useTaskStore();
  const { user, logout: doLogout } = useAuthStore();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    setCreating(true);
    const board = await createBoard(newBoardName.trim());
    setCreating(false);
    if (board) {
      setShowCreate(false);
      setNewBoardName('');
      onBoardSelect(board);
      navigate(`/board/${board.id}`);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    const board = await joinBoard(inviteCode.trim());
    setJoining(false);
    if (board) {
      setShowJoin(false);
      setInviteCode('');
      navigate(`/board/${board.id}`);
    }
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-700/50 flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-bold text-slate-100 text-lg">TaskFlow</span>
        </div>
      </div>

      {/* Boards list */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Boards</p>
        </div>

        {isLoadingBoards ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-slate-800 rounded-lg animate-skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-slate-500 text-sm">No boards yet</p>
            <p className="text-slate-600 text-xs mt-1">Create or join one below</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {boards.map((board) => (
              <li key={board.id}>
                <button
                  onClick={() => { onBoardSelect(board); navigate(`/board/${board.id}`); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-sm group ${
                    selectedBoardId === board.id
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: board.role === 'owner' ? '#6366f1' : '#8b5cf6' }}
                  />
                  <span className="truncate font-medium">{board.name}</span>
                  {board.role === 'owner' && (
                    <span className="ml-auto text-[10px] text-slate-600 group-hover:text-slate-500">Owner</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 border-t border-slate-700/50">
        <Button variant="primary" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Board
        </Button>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => setShowJoin(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Join Board
        </Button>
      </div>

      {/* User */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
          >
            {user?.display_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.display_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={doLogout}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-all p-1 rounded"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Create board modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewBoardName(''); }} title="Create Board">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Board Name</label>
            <input
              autoFocus
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Product Roadmap"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1" loading={creating} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Join board modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setInviteCode(''); }} title="Join Board">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Invite Code</label>
            <input
              autoFocus
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="XXXXXXXX"
              maxLength={8}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest uppercase"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowJoin(false)}>Cancel</Button>
            <Button className="flex-1" loading={joining} onClick={handleJoin}>Join</Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
