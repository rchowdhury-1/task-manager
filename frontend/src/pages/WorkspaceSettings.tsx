import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { WorkspaceMember, Workspace } from '../types';
import Navbar from '../components/Layout/Navbar';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function WorkspaceSettings() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!workspaceId) return;
    try {
      const [wsRes, membersRes] = await Promise.all([
        api.get('/workspaces'),
        api.get(`/workspaces/${workspaceId}/members`),
      ]);
      const ws = wsRes.data.find((w: Workspace) => w.id === workspaceId);
      setWorkspace(ws || null);
      setMembers(membersRes.data);
    } catch {
      toast.error('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [workspaceId]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      toast.success('Member invited successfully');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      toast.success('Workspace deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = workspace?.owner_id === user?.id;

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

  if (!workspace) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <p style={{ color: 'var(--text)' }}>Workspace not found</p>
          <Link to="/dashboard" className="text-sm mt-2 inline-block" style={{ color: 'var(--primary)' }}>← Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>← Dashboard</Link>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{workspace.name} — Settings</h1>
        </div>

        {/* Invite members */}
        {(isOwner || members.find((m) => m.id === user?.id && ['owner','admin'].includes(m.role))) && (
          <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>Invite members</h2>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border focus:border-emerald-500 transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-lg border focus:border-emerald-500 transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" loading={inviting} disabled={!inviteEmail.trim()}>
                Invite
              </Button>
            </form>
          </div>
        )}

        {/* Members list */}
        <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
            Members ({members.length})
          </h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--surface-2)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: member.avatar_color, color: '#fff' }}
                >
                  {member.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {member.name}
                    {member.id === user?.id && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--primary)' }}>You</span>
                    )}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full capitalize"
                  style={{
                    background: member.role === 'owner' ? 'rgba(16,185,129,0.1)' : 'var(--surface)',
                    color: member.role === 'owner' ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  {member.role}
                </span>
                {isOwner && member.id !== user?.id && member.role !== 'owner' && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={removingId === member.id}
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remove
                  </Button>
                )}
                {!isOwner && member.id === user?.id && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={removingId === member.id}
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Leave
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        {isOwner && (
          <div
            className="p-6 rounded-xl border"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <h2 className="text-base font-bold mb-2" style={{ color: '#ef4444' }}>Danger zone</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Permanently delete this workspace and all its boards, columns, and cards.
            </p>
            <Button variant="danger" loading={deleting} onClick={handleDeleteWorkspace}>
              Delete workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
