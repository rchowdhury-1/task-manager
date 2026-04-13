import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Workspace, Board, DashboardStats } from '../types';
import Navbar from '../components/Layout/Navbar';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import toast from 'react-hot-toast';

const COLORS = ['#10b981','#f97316','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b'];

const PriorityBadge = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
    <p className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>{value}</p>
    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
    {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBoards, setRecentBoards] = useState<Board[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsModalOpen, setWsModalOpen] = useState(false);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [boardName, setBoardName] = useState('');
  const [boardColor, setBoardColor] = useState('#10b981');
  const [selectedWsId, setSelectedWsId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, wsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/workspaces'),
      ]);
      setStats(dashRes.data.stats);
      setRecentBoards(dashRes.data.recentBoards);
      setWorkspaces(wsRes.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createWorkspace = async () => {
    if (!wsName.trim()) return toast.error('Workspace name required');
    setCreating(true);
    try {
      await api.post('/workspaces', { name: wsName.trim() });
      setWsModalOpen(false);
      setWsName('');
      toast.success('Workspace created!');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const createBoard = async () => {
    if (!boardName.trim()) return toast.error('Board name required');
    if (!selectedWsId) return toast.error('Select a workspace');
    setCreating(true);
    try {
      const res = await api.post('/boards', { name: boardName.trim(), workspaceId: selectedWsId, color: boardColor });
      setBoardModalOpen(false);
      setBoardName('');
      toast.success('Board created!');
      navigate(`/board/${res.data.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <PriorityBadge label="Workspaces" value={stats?.workspaces || 0} />
          <PriorityBadge label="Boards" value={stats?.boards || 0} />
          <PriorityBadge label="Assigned to me" value={stats?.assignedCards || 0} sub="cards" />
          <PriorityBadge label="Overdue" value={stats?.overdueCards || 0} sub="cards past due" />
        </div>

        {/* Recent Boards */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Recent boards</h2>
            <Button variant="secondary" size="sm" onClick={() => setBoardModalOpen(true)}>
              + New board
            </Button>
          </div>
          {recentBoards.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-12 text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>No boards yet</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create your first board to get started</p>
              <Button size="sm" onClick={() => setBoardModalOpen(true)}>Create board</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBoards.map((board) => (
                <Link
                  key={board.id}
                  to={`/board/${board.id}`}
                  className="group p-5 rounded-xl border hover:border-emerald-500/40 transition-all"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: board.color || 'var(--primary)' }} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate group-hover:text-emerald-400 transition-colors" style={{ color: 'var(--text)' }}>
                        {board.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{board.workspace_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{board.column_count || 0} columns</span>
                    <span>{board.card_count || 0} cards</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={() => setBoardModalOpen(true)}
                className="p-5 rounded-xl border border-dashed hover:border-emerald-500/40 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-2xl" style={{ color: 'var(--text-muted)' }}>+</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>New board</span>
              </button>
            </div>
          )}
        </div>

        {/* Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Your workspaces</h2>
            <Button variant="secondary" size="sm" onClick={() => setWsModalOpen(true)}>
              + New workspace
            </Button>
          </div>
          {workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-2xl mb-2">🏢</p>
              <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>No workspaces</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create a workspace to organize your boards</p>
              <Button size="sm" onClick={() => setWsModalOpen(true)}>Create workspace</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="p-5 rounded-xl border hover:border-emerald-500/40 transition-all"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>{ws.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {ws.member_count} member{ws.member_count !== 1 ? 's' : ''} · {ws.board_count} board{ws.board_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link
                      to={`/workspace/${ws.id}/settings`}
                      className="text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <Modal isOpen={wsModalOpen} onClose={() => { setWsModalOpen(false); setWsName(''); }} title="New Workspace">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Workspace name</label>
            <input
              autoFocus
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
              placeholder="My Team"
              className="w-full px-4 py-3 rounded-lg text-sm border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setWsModalOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={createWorkspace}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Create Board Modal */}
      <Modal isOpen={boardModalOpen} onClose={() => { setBoardModalOpen(false); setBoardName(''); }} title="New Board">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Board name</label>
            <input
              autoFocus
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="My Project"
              className="w-full px-4 py-3 rounded-lg text-sm border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Workspace</label>
            <select
              value={selectedWsId}
              onChange={(e) => setSelectedWsId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBoardColor(c)}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110 border-2"
                  style={{ background: c, borderColor: boardColor === c ? 'white' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setBoardModalOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={createBoard} disabled={!selectedWsId}>Create board</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
