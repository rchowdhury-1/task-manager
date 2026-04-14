import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column, Card, WorkspaceMember } from '../../types';
import ColumnComponent from '../Column/ColumnComponent';
import CardItem from '../Card/CardItem';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  columns: Column[];
  cards: Card[];
  boardId: string;
  members: WorkspaceMember[];
  onColumnCreated: (col: Column) => void;
  onColumnDeleted: (colId: string) => void;
  onColumnUpdated: (col: Column) => void;
  onCardCreated: (card: Card) => void;
  onCardClick: (card: Card) => void;
  onCardsUpdate: (cards: Card[]) => void;
  onColumnsUpdate: (columns: Column[]) => void;
}

export default function KanbanBoard({
  columns, cards, boardId, members,
  onColumnCreated, onColumnDeleted, onColumnUpdated,
  onCardCreated, onCardClick, onCardsUpdate, onColumnsUpdate,
}: KanbanBoardProps) {
  const { socket } = useSocket();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [creatingCol, setCreatingCol] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getCardsByColumn = useCallback((columnId: string) =>
    cards.filter((c) => c.column_id === columnId).sort((a, b) => a.position - b.position),
  [cards]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'card') return;

    const activeCard = activeData.card as Card;
    const overColumnId = overData?.type === 'column'
      ? (overData.column as Column).id
      : (overData?.card as Card)?.column_id;

    if (!overColumnId || activeCard.column_id === overColumnId) return;

    onCardsUpdate(cards.map((c) =>
      c.id === activeCard.id ? { ...c, column_id: overColumnId } : c
    ));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'card') {
      const activeCard = activeData.card as Card;
      const overColumnId = overData?.type === 'column'
        ? (overData.column as Column).id
        : (overData?.card as Card)?.column_id || activeCard.column_id;

      const columnCards = cards
        .filter((c) => c.column_id === overColumnId)
        .sort((a, b) => a.position - b.position);

      const oldIndex = columnCards.findIndex((c) => c.id === activeCard.id);
      const overCardId = overData?.type === 'card' ? over.id : null;
      const newIndex = overCardId
        ? columnCards.findIndex((c) => c.id === overCardId)
        : columnCards.length - 1;

      let reordered = columnCards;
      if (activeCard.column_id === overColumnId) {
        reordered = arrayMove(columnCards, oldIndex, newIndex < 0 ? 0 : newIndex);
      } else {
        const moved = { ...activeCard, column_id: overColumnId };
        reordered.splice(newIndex < 0 ? reordered.length : newIndex, 0, moved);
      }

      const updated = reordered.map((c, i) => ({ ...c, position: i }));
      const otherCards = cards.filter((c) => c.column_id !== overColumnId && c.id !== activeCard.id);
      onCardsUpdate([...otherCards, ...updated]);

      try {
        const payload = updated.map((c) => ({ id: c.id, columnId: overColumnId, position: c.position }));
        await api.put('/cards/reorder', { cards: payload });
        socket?.emit('card-moved', {
          boardId,
          cardId: activeCard.id,
          fromColumn: activeCard.column_id,
          toColumn: overColumnId,
          cards: payload,
        });
      } catch {
        toast.error('Failed to save card position');
      }
    }
  };

  const handleAddColumn = async () => {
    if (!newColTitle.trim()) return;
    setCreatingCol(true);
    try {
      const res = await api.post('/columns', { title: newColTitle.trim(), boardId });
      onColumnCreated(res.data);
      socket?.emit('column-created', { boardId, column: res.data });
      setNewColTitle('');
      setAddingColumn(false);
    } catch {
      toast.error('Failed to create column');
    } finally {
      setCreatingCol(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="board-scroll">
        {columns.sort((a, b) => a.position - b.position).map((column) => (
          <ColumnComponent
            key={column.id}
            column={column}
            cards={getCardsByColumn(column.id)}
            boardId={boardId}
            onCardCreated={onCardCreated}
            onCardClick={onCardClick}
            onColumnDeleted={onColumnDeleted}
            onColumnUpdated={onColumnUpdated}
          />
        ))}

        {/* Add column */}
        <div className="flex-shrink-0 w-72">
          {addingColumn ? (
            <div
              className="p-3 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <input
                autoFocus
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColTitle(''); }
                }}
                placeholder="Column title..."
                className="w-full px-3 py-2 text-sm rounded-lg border focus:border-emerald-500 transition-colors mb-2"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  disabled={creatingCol || !newColTitle.trim()}
                  className="flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'var(--primary)', color: '#000' }}
                >
                  {creatingCol ? 'Adding...' : 'Add column'}
                </button>
                <button
                  onClick={() => { setAddingColumn(false); setNewColTitle(''); }}
                  className="px-3 py-1.5 text-sm rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm transition-all hover:border-emerald-500/40 hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <span className="text-xl leading-none">+</span>
              Add column
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div style={{ transform: 'rotate(3deg)', opacity: 0.9 }}>
            <CardItem card={activeCard} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
