import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { Board, Column, Card, WorkspaceMember } from '../types';
import Navbar from '../components/Layout/Navbar';
import KanbanBoard from '../components/Board/KanbanBoard';
import CardModal from '../components/Card/CardModal';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { socket, joinBoard, leaveBoard } = useSocket();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const fetchBoardData = useCallback(async () => {
    if (!boardId) return;
    try {
      const [boardRes, colsRes, cardsRes] = await Promise.all([
        api.get(`/boards/${boardId}`),
        api.get(`/columns?boardId=${boardId}`),
        api.get(`/cards?boardId=${boardId}`),
      ]);
      setBoard(boardRes.data);
      setColumns(colsRes.data);
      setCards(cardsRes.data);

      // Fetch members
      const membersRes = await api.get(`/workspaces/${boardRes.data.workspace_id}/members`);
      setMembers(membersRes.data);
    } catch {
      toast.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Socket room join/leave
  useEffect(() => {
    if (!boardId || !socket) return;
    joinBoard(boardId);
    return () => leaveBoard(boardId);
  }, [boardId, socket]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const onCardMoved = (data: { cards: { id: string; columnId: string; position: number }[] }) => {
      setCards((prev) => {
        const updated = [...prev];
        data.cards.forEach(({ id, columnId, position }) => {
          const idx = updated.findIndex((c) => c.id === id);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], column_id: columnId, position };
          }
        });
        return updated;
      });
    };

    const onCardCreated = (data: { card: Card }) => {
      setCards((prev) => {
        if (prev.find((c) => c.id === data.card.id)) return prev;
        return [...prev, data.card];
      });
    };

    const onCardUpdated = (data: { card: Card }) => {
      setCards((prev) => prev.map((c) => c.id === data.card.id ? data.card : c));
      setSelectedCard((prev) => prev?.id === data.card.id ? data.card : prev);
    };

    const onCardDeleted = (data: { cardId: string }) => {
      setCards((prev) => prev.filter((c) => c.id !== data.cardId));
      setSelectedCard((prev) => prev?.id === data.cardId ? null : prev);
    };

    const onColumnCreated = (data: { column: Column }) => {
      setColumns((prev) => {
        if (prev.find((c) => c.id === data.column.id)) return prev;
        return [...prev, data.column];
      });
    };

    const onColumnUpdated = (data: { column: Column }) => {
      setColumns((prev) => prev.map((c) => c.id === data.column.id ? data.column : c));
    };

    const onColumnDeleted = (data: { columnId: string }) => {
      setColumns((prev) => prev.filter((c) => c.id !== data.columnId));
      setCards((prev) => prev.filter((c) => c.column_id !== data.columnId));
    };

    socket.on('card-moved', onCardMoved);
    socket.on('card-created', onCardCreated);
    socket.on('card-updated', onCardUpdated);
    socket.on('card-deleted', onCardDeleted);
    socket.on('column-created', onColumnCreated);
    socket.on('column-updated', onColumnUpdated);
    socket.on('column-deleted', onColumnDeleted);

    return () => {
      socket.off('card-moved', onCardMoved);
      socket.off('card-created', onCardCreated);
      socket.off('card-updated', onCardUpdated);
      socket.off('card-deleted', onCardDeleted);
      socket.off('column-created', onColumnCreated);
      socket.off('column-updated', onColumnUpdated);
      socket.off('column-deleted', onColumnDeleted);
    };
  }, [socket]);

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

  if (!board) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p style={{ color: 'var(--text)' }}>Board not found</p>
          <Link to="/dashboard" className="text-sm" style={{ color: 'var(--primary)' }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Board header */}
      <div
        className="border-b px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
      >
        <Link to="/dashboard" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
          Dashboard
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>›</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{board.workspace_name}</span>
        <span style={{ color: 'var(--text-muted)' }}>›</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: board.color }} />
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{board.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live</span>
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ background: m.avatar_color, color: '#fff', borderColor: 'var(--bg-2)' }}
                title={m.name}
              >
                {m.name[0]?.toUpperCase()}
              </div>
            ))}
            {members.length > 4 && (
              <div
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--bg-2)' }}
              >
                +{members.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      <KanbanBoard
        columns={columns}
        cards={cards}
        boardId={boardId!}
        members={members}
        onColumnCreated={(col) => setColumns((prev) => [...prev, col])}
        onColumnDeleted={(colId) => {
          setColumns((prev) => prev.filter((c) => c.id !== colId));
          setCards((prev) => prev.filter((c) => c.column_id !== colId));
        }}
        onColumnUpdated={(col) => setColumns((prev) => prev.map((c) => c.id === col.id ? col : c))}
        onCardCreated={(card) => setCards((prev) => [...prev, card])}
        onCardClick={(card) => setSelectedCard(card)}
        onCardsUpdate={setCards}
        onColumnsUpdate={setColumns}
      />

      <CardModal
        card={selectedCard}
        boardId={boardId!}
        members={members}
        onClose={() => setSelectedCard(null)}
        onUpdate={(updatedCard) => setCards((prev) => prev.map((c) => c.id === updatedCard.id ? updatedCard : c))}
        onDelete={(cardId) => setCards((prev) => prev.filter((c) => c.id !== cardId))}
      />
    </div>
  );
}
