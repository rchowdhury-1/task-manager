import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Card } from '../../types';
import CardItem from '../Card/CardItem';
import Button from '../UI/Button';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';

interface ColumnComponentProps {
  column: Column;
  cards: Card[];
  boardId: string;
  onCardCreated: (card: Card) => void;
  onCardClick: (card: Card) => void;
  onColumnDeleted: (columnId: string) => void;
  onColumnUpdated: (column: Column) => void;
}

export default function ColumnComponent({
  column, cards, boardId, onCardCreated, onCardClick, onColumnDeleted, onColumnUpdated,
}: ColumnComponentProps) {
  const { socket } = useSocket();
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column', column } });
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [colTitle, setColTitle] = useState(column.title);
  const [deletingCol, setDeletingCol] = useState(false);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    setCreatingCard(true);
    try {
      const res = await api.post('/cards', { title: newCardTitle.trim(), columnId: column.id });
      onCardCreated(res.data);
      socket?.emit('card-created', { boardId, card: res.data });
      setNewCardTitle('');
      setAddingCard(false);
    } catch {
      toast.error('Failed to create card');
    } finally {
      setCreatingCard(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (!colTitle.trim() || colTitle === column.title) {
      setColTitle(column.title);
      setEditingTitle(false);
      return;
    }
    try {
      const res = await api.put(`/columns/${column.id}`, { title: colTitle.trim() });
      onColumnUpdated(res.data);
      socket?.emit('column-updated', { boardId, column: res.data });
    } catch {
      toast.error('Failed to rename column');
      setColTitle(column.title);
    } finally {
      setEditingTitle(false);
    }
  };

  const handleDeleteColumn = async () => {
    setDeletingCol(true);
    try {
      await api.delete(`/columns/${column.id}`);
      socket?.emit('column-deleted', { boardId, columnId: column.id });
      onColumnDeleted(column.id);
      toast.success('Column deleted');
    } catch {
      toast.error('Failed to delete column');
    } finally {
      setDeletingCol(false);
    }
  };

  return (
    <div className="column-container flex flex-col">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={colTitle}
              onChange={(e) => setColTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(); if (e.key === 'Escape') { setColTitle(column.title); setEditingTitle(false); } }}
              className="flex-1 text-sm font-semibold px-2 py-1 rounded border focus:border-emerald-500 transition-colors"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          ) : (
            <h3
              className="text-sm font-semibold truncate cursor-pointer hover:text-emerald-400 transition-colors"
              style={{ color: 'var(--text)' }}
              onClick={() => setEditingTitle(true)}
            >
              {column.title}
            </h3>
          )}
          <span
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            {cards.length}
          </span>
        </div>
        <button
          onClick={handleDeleteColumn}
          disabled={deletingCol}
          className="flex-shrink-0 ml-1 w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-red-500/20 hover:text-red-400 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Delete column"
        >
          ×
        </button>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className="card-list flex-1 rounded-xl p-2 transition-colors min-h-[60px]"
        style={{
          background: isOver ? 'rgba(16,185,129,0.05)' : 'transparent',
          border: isOver ? '1px dashed rgba(16,185,129,0.4)' : '1px solid transparent',
        }}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="mt-2 px-1">
        {addingCard ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
              }}
              placeholder="Card title... (Enter to add)"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:border-emerald-500 transition-colors resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-2">
              <Button size="sm" loading={creatingCard} onClick={handleAddCard} disabled={!newCardTitle.trim()}>
                Add card
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCard(false); setNewCardTitle(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-lg leading-none">+</span>
            Add card
          </button>
        )}
      </div>
    </div>
  );
}
