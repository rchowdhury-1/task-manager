import { useState, useEffect, FormEvent } from 'react';
import { Card, Comment, WorkspaceMember } from '../../types';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface CardModalProps {
  card: Card | null;
  boardId: string;
  members: WorkspaceMember[];
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#eab308', high: '#f97316', urgent: '#ef4444',
};

export default function CardModal({ card, boardId, members, onClose, onUpdate, onDelete }: CardModalProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description || '');
    setDueDate(card.due_date ? format(parseISO(card.due_date), 'yyyy-MM-dd') : '');
    setAssignedTo(card.assigned_to || '');
    setPriority(card.priority);
    loadComments();
  }, [card?.id]);

  useEffect(() => {
    if (!socket || !card) return;
    const onCommentCreated = (data: { comment: Comment; cardId: string }) => {
      if (data.cardId === card.id) {
        setComments((prev) => [...prev, data.comment]);
      }
    };
    const onCommentDeleted = (data: { commentId: string; cardId: string }) => {
      if (data.cardId === card.id) {
        setComments((prev) => prev.filter((c) => c.id !== data.commentId));
      }
    };
    socket.on('comment-created', onCommentCreated);
    socket.on('comment-deleted', onCommentDeleted);
    return () => {
      socket.off('comment-created', onCommentCreated);
      socket.off('comment-deleted', onCommentDeleted);
    };
  }, [socket, card?.id]);

  const loadComments = async () => {
    if (!card) return;
    setLoadingComments(true);
    try {
      const res = await api.get(`/comments?cardId=${card.id}`);
      setComments(res.data);
    } catch {
      // silent
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSave = async () => {
    if (!card || !title.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(`/cards/${card.id}`, {
        title: title.trim(),
        description: description || null,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
        priority,
      });
      onUpdate(res.data);
      socket?.emit('card-updated', { boardId, card: res.data });
      setEditing(false);
      toast.success('Card updated');
    } catch {
      toast.error('Failed to update card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    setDeleting(true);
    try {
      await api.delete(`/cards/${card.id}`);
      socket?.emit('card-deleted', { boardId, cardId: card.id, columnId: card.column_id });
      onDelete(card.id);
      onClose();
      toast.success('Card deleted');
    } catch {
      toast.error('Failed to delete card');
    } finally {
      setDeleting(false);
    }
  };

  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !card) return;
    setCommenting(true);
    try {
      const res = await api.post('/comments', { cardId: card.id, content: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      socket?.emit('comment-created', { boardId, cardId: card.id, comment: res.data });
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      socket?.emit('comment-deleted', { boardId, cardId: card?.id, commentId });
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  if (!card) return null;

  return (
    <Modal isOpen={!!card} onClose={onClose} size="xl">
      <div className="flex flex-col lg:flex-row max-h-[85vh]">
        {/* Main content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-4">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-lg font-bold px-3 py-2 rounded-lg border focus:border-emerald-500 transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            ) : (
              <h2
                className="flex-1 text-lg font-bold cursor-pointer hover:text-emerald-400 transition-colors"
                style={{ color: 'var(--text)' }}
                onClick={() => setEditing(true)}
              >
                {card.title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Description
            </label>
            {editing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add a description..."
                className="w-full px-3 py-2 rounded-lg text-sm border focus:border-emerald-500 transition-colors resize-none"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            ) : (
              <p
                className="text-sm leading-relaxed cursor-pointer min-h-[40px] px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: description ? 'var(--text)' : 'var(--text-muted)' }}
                onClick={() => setEditing(true)}
              >
                {description || 'Click to add a description...'}
              </p>
            )}
          </div>

          {/* Edit actions */}
          {editing && (
            <div className="flex gap-2 mb-6">
              <Button loading={saving} onClick={handleSave} size="sm">Save changes</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Activity
            </label>
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: comment.avatar_color, color: '#fff' }}
                    >
                      {comment.user_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{comment.user_name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {format(parseISO(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                        {comment.user_id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs hover:text-red-400 transition-colors ml-auto"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div
                        className="text-sm rounded-lg px-3 py-2"
                        style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      >
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleComment} className="flex gap-2">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: user?.avatar_color || 'var(--primary)', color: '#fff' }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border focus:border-emerald-500 transition-colors"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <Button type="submit" loading={commenting} size="sm" disabled={!newComment.trim()}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-56 p-5 border-t lg:border-t-0 lg:border-l space-y-5" style={{ borderColor: 'var(--border)' }}>
          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Priority</label>
            <div className="space-y-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPriority(p); setEditing(true); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{
                    background: priority === p ? `${PRIORITY_COLORS[p]}20` : 'transparent',
                    color: priority === p ? PRIORITY_COLORS[p] : 'var(--text-muted)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Assignee</label>
            <select
              value={assignedTo}
              onChange={(e) => { setAssignedTo(e.target.value); setEditing(true); }}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); setEditing(true); }}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)', colorScheme: 'dark' }}
            />
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button variant="danger" size="sm" className="w-full" loading={deleting} onClick={handleDelete}>
              Delete card
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
